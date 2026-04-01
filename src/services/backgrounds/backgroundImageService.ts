import { convertFileSrc, isTauri } from '@tauri-apps/api/core';
import { BaseDirectory, appLocalDataDir, join } from '@tauri-apps/api/path';
import { exists, mkdir, readDir, remove, writeFile } from '@tauri-apps/plugin-fs';
import { initializePersistence } from '../../persistence';
import { createBackgroundProviders } from './providers';
import { generateBackgroundQueryTiers } from './queryGenerator';
import { scoreBackgroundCandidate } from './scoring';
import type {
  BackgroundImageCandidate,
  BackgroundImageRequest,
  BackgroundMappingPreview,
  BackgroundProvider,
  BackgroundValidationResult,
  CardBackgroundSelection,
  ScoredBackgroundCandidate,
} from './types';

const CACHE_DIR = 'background-cache';
const ASSETS_DIR = `${CACHE_DIR}/assets`;
const FALLBACK_ASSET = '/continue_learning.png';

interface MappingRow {
  item_key: string;
  item_type: string;
  language_code: string | null;
  query_used: string | null;
  provider: string | null;
  asset_id: string | null;
  semantic_input_json: string;
  scoring_json: string;
  updated_at: string;
}

interface AssetRow {
  id: string;
  source_key: string;
  provider: string;
  provider_image_id: string;
  image_url: string;
  download_url: string;
  page_url: string;
  photographer_name: string;
  photographer_url: string | null;
  attribution_text: string;
  dominant_color: string | null;
  tags_json: string;
  width: number;
  height: number;
  local_relative_path: string;
  created_at: string;
  updated_at: string;
  last_checked_at: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function buildFallback(request: BackgroundImageRequest): CardBackgroundSelection {
  return {
    itemKey: request.itemKey,
    source: request.fallbackAsset || FALLBACK_ASSET,
    provider: 'fallback',
    attributionText: 'Bundled local fallback',
    fromCache: true,
  };
}

async function fetchBinary(url: string, signal?: AbortSignal): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch {
    return null;
  }
}

export class BackgroundImageService {
  private readonly providers: BackgroundProvider[];
  private readonly providerLastRequestAt = new Map<string, number>();

  constructor() {
    this.providers = createBackgroundProviders();
  }

  private async providerDelay(providerName: string): Promise<void> {
    const now = Date.now();
    const prev = this.providerLastRequestAt.get(providerName) ?? 0;
    const waitMs = Math.max(0, 350 - (now - prev));
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    this.providerLastRequestAt.set(providerName, Date.now());
  }

  private async resolveLocalSource(relativePath: string): Promise<string | null> {
    if (!isTauri()) return null;
    const present = await exists(relativePath, { baseDir: BaseDirectory.AppLocalData });
    if (!present) return null;
    const absolute = await join(await appLocalDataDir(), relativePath);
    return convertFileSrc(absolute);
  }

  private async persistCandidate(
    request: BackgroundImageRequest,
    scored: ScoredBackgroundCandidate,
    signal?: AbortSignal,
  ): Promise<CardBackgroundSelection | null> {
    const persistence = await initializePersistence();
    const db = persistence.db;
    const candidate = scored.candidate;
    const sourceKey = `${candidate.provider}:${candidate.providerImageId}`;
    const relativePath = `${ASSETS_DIR}/${stableHash(candidate.downloadUrl || candidate.imageUrl)}.jpg`;
    const now = nowIso();

    const binary = await fetchBinary(candidate.downloadUrl || candidate.imageUrl, signal);
    if (!binary) {
      return null;
    }

    await mkdir(ASSETS_DIR, { recursive: true, baseDir: BaseDirectory.AppLocalData });
    await writeFile(relativePath, binary, { baseDir: BaseDirectory.AppLocalData });

    const existingAssetRows = await db.select<AssetRow>('SELECT * FROM background_image_assets WHERE source_key = ? LIMIT 1;', [sourceKey]);
    const assetId = existingAssetRows[0]?.id || `bgasset_${stableHash(sourceKey + now)}`;

    await db.execute(
      `
      INSERT INTO background_image_assets (
        id, source_key, provider, provider_image_id, image_url, download_url, page_url,
        photographer_name, photographer_url, attribution_text, dominant_color, tags_json,
        width, height, local_relative_path, created_at, updated_at, last_checked_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_key) DO UPDATE SET
        image_url = excluded.image_url,
        download_url = excluded.download_url,
        page_url = excluded.page_url,
        photographer_name = excluded.photographer_name,
        photographer_url = excluded.photographer_url,
        attribution_text = excluded.attribution_text,
        dominant_color = excluded.dominant_color,
        tags_json = excluded.tags_json,
        width = excluded.width,
        height = excluded.height,
        local_relative_path = excluded.local_relative_path,
        updated_at = excluded.updated_at,
        last_checked_at = excluded.last_checked_at;
      `,
      [
        assetId,
        sourceKey,
        candidate.provider,
        candidate.providerImageId,
        candidate.imageUrl,
        candidate.downloadUrl,
        candidate.pageUrl,
        candidate.photographerName,
        candidate.photographerUrl ?? null,
        candidate.attributionText,
        candidate.colorHex ?? null,
        JSON.stringify(candidate.tags),
        candidate.width,
        candidate.height,
        relativePath,
        now,
        now,
        now,
      ],
    );

    await db.execute(
      `
      INSERT INTO background_image_mappings (
        item_key, item_type, language_code, query_used, provider, asset_id,
        semantic_input_json, scoring_json, created_at, updated_at, last_refreshed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(item_key) DO UPDATE SET
        item_type = excluded.item_type,
        language_code = excluded.language_code,
        query_used = excluded.query_used,
        provider = excluded.provider,
        asset_id = excluded.asset_id,
        semantic_input_json = excluded.semantic_input_json,
        scoring_json = excluded.scoring_json,
        updated_at = excluded.updated_at,
        last_refreshed_at = excluded.last_refreshed_at;
      `,
      [
        request.itemKey,
        request.itemType,
        request.languageCode ?? null,
        scored.query,
        candidate.provider,
        assetId,
        JSON.stringify(request),
        JSON.stringify({
          score: scored.score,
          reasons: scored.reasons,
          tierLevel: scored.tierLevel,
        }),
        now,
        now,
        now,
      ],
    );

    const localSource = await this.resolveLocalSource(relativePath);
    return {
      itemKey: request.itemKey,
      source: localSource ?? candidate.imageUrl,
      provider: candidate.provider,
      attributionText: candidate.attributionText,
      photographerName: candidate.photographerName,
      sourcePage: candidate.pageUrl,
      localRelativePath: relativePath,
      fromCache: false,
    };
  }

  private async loadCachedMapping(itemKey: string): Promise<{ mapping: MappingRow; asset: AssetRow | null } | null> {
    const persistence = await initializePersistence();
    const mappings = await persistence.db.select<MappingRow>('SELECT * FROM background_image_mappings WHERE item_key = ? LIMIT 1;', [itemKey]);
    const mapping = mappings[0];
    if (!mapping) return null;
    if (!mapping.asset_id) return { mapping, asset: null };
    const assets = await persistence.db.select<AssetRow>('SELECT * FROM background_image_assets WHERE id = ? LIMIT 1;', [mapping.asset_id]);
    return { mapping, asset: assets[0] ?? null };
  }

  private async fromCachedRow(request: BackgroundImageRequest, cached: { mapping: MappingRow; asset: AssetRow | null }): Promise<CardBackgroundSelection | null> {
    const asset = cached.asset;
    if (!asset) return null;
    const local = await this.resolveLocalSource(asset.local_relative_path);
    const source = local ?? asset.image_url;
    if (!source) return null;

    return {
      itemKey: request.itemKey,
      source,
      provider: (asset.provider as CardBackgroundSelection['provider']) ?? 'fallback',
      attributionText: asset.attribution_text,
      photographerName: asset.photographer_name,
      sourcePage: asset.page_url,
      localRelativePath: asset.local_relative_path,
      fromCache: true,
    };
  }

  private async searchAcrossProviders(query: string, signal?: AbortSignal): Promise<BackgroundImageCandidate[]> {
    if (this.providers.length === 0) return [];

    const searches = this.providers.map(async (provider) => {
      await this.providerDelay(provider.name);
      return provider.searchImages(query, { perPage: 10, signal });
    });

    const settled = await Promise.allSettled(searches);
    const out: BackgroundImageCandidate[] = [];
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        out.push(...result.value);
      }
    }
    return out;
  }

  async resolveBackground(
    request: BackgroundImageRequest,
    options?: { forceRefresh?: boolean; signal?: AbortSignal },
  ): Promise<CardBackgroundSelection> {
    if (!isTauri()) {
      return buildFallback(request);
    }

    if (!options?.forceRefresh) {
      const cached = await this.loadCachedMapping(request.itemKey);
      if (cached) {
        const selected = await this.fromCachedRow(request, cached);
        if (selected) return selected;
      }
    }

    const tiers = generateBackgroundQueryTiers(request);
    let best: ScoredBackgroundCandidate | null = null;

    for (const tier of tiers) {
      for (const query of tier.queries) {
        const candidates = await this.searchAcrossProviders(query, options?.signal);
        for (const candidate of candidates) {
          const scored = scoreBackgroundCandidate(candidate, request, tier.level, query);
          if (!best || scored.score > best.score) {
            best = scored;
          }
        }
      }
      const currentBestScore = best?.score ?? Number.NEGATIVE_INFINITY;
      if (currentBestScore >= 30) {
        break;
      }
    }

    if (!best) {
      return buildFallback(request);
    }

    const persisted = await this.persistCandidate(request, best, options?.signal);
    return persisted ?? buildFallback(request);
  }

  async prefetch(requests: BackgroundImageRequest[], options?: { signal?: AbortSignal }): Promise<number> {
    let hydrated = 0;
    for (const request of requests) {
      if (options?.signal?.aborted) break;
      const selection = await this.resolveBackground(request, { signal: options?.signal });
      if (selection.provider !== 'fallback') hydrated += 1;
    }
    return hydrated;
  }

  async regenerateItem(request: BackgroundImageRequest): Promise<CardBackgroundSelection> {
    return this.resolveBackground(request, { forceRefresh: true });
  }

  async regenerateAll(): Promise<number> {
    if (!isTauri()) return 0;
    const persistence = await initializePersistence();
    const rows = await persistence.db.select<MappingRow>('SELECT * FROM background_image_mappings ORDER BY updated_at DESC;');
    let count = 0;
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.semantic_input_json) as BackgroundImageRequest;
        await this.resolveBackground(parsed, { forceRefresh: true });
        count += 1;
      } catch {
        // Ignore malformed rows.
      }
    }
    return count;
  }

  async clearCache(): Promise<void> {
    if (!isTauri()) return;
    const persistence = await initializePersistence();
    await persistence.db.execute('DELETE FROM background_image_mappings;');
    await persistence.db.execute('DELETE FROM background_image_assets;');
    const cacheExists = await exists(CACHE_DIR, { baseDir: BaseDirectory.AppLocalData });
    if (cacheExists) {
      await remove(CACHE_DIR, { baseDir: BaseDirectory.AppLocalData, recursive: true });
    }
  }

  async validateCache(): Promise<BackgroundValidationResult> {
    if (!isTauri()) {
      return { total: 0, healthy: 0, missing: [] };
    }
    const persistence = await initializePersistence();
    const rows = await persistence.db.select<Array<MappingRow & { local_relative_path: string | null }>[number]>(
      `
      SELECT m.item_key, m.item_type, m.language_code, m.query_used, m.provider, m.asset_id, m.semantic_input_json,
             m.scoring_json, m.updated_at, a.local_relative_path
      FROM background_image_mappings m
      LEFT JOIN background_image_assets a ON a.id = m.asset_id;
      `,
    );

    const missing: Array<{ itemKey: string; localRelativePath: string }> = [];
    for (const row of rows) {
      if (!row.local_relative_path) continue;
      const present = await exists(row.local_relative_path, { baseDir: BaseDirectory.AppLocalData });
      if (!present) {
        missing.push({ itemKey: row.item_key, localRelativePath: row.local_relative_path });
      }
    }

    return {
      total: rows.length,
      healthy: rows.length - missing.length,
      missing,
    };
  }

  async listMappings(limit = 60): Promise<BackgroundMappingPreview[]> {
    if (!isTauri()) return [];
    const persistence = await initializePersistence();
    const rows = await persistence.db.select<Array<MappingRow & {
      source: string | null;
      attribution_text: string | null;
      local_relative_path: string | null;
    }>[number]>(
      `
      SELECT
        m.item_key,
        m.item_type,
        m.language_code,
        m.query_used,
        m.provider,
        m.asset_id,
        m.semantic_input_json,
        m.scoring_json,
        m.updated_at,
        a.image_url AS source,
        a.attribution_text,
        a.local_relative_path
      FROM background_image_mappings m
      LEFT JOIN background_image_assets a ON a.id = m.asset_id
      ORDER BY m.updated_at DESC
      LIMIT ?;
      `,
      [Math.max(1, Math.min(limit, 300))],
    );

    const previews: BackgroundMappingPreview[] = [];
    for (const row of rows) {
      let resolvedSource = row.source || FALLBACK_ASSET;
      if (row.local_relative_path) {
        const local = await this.resolveLocalSource(row.local_relative_path);
        if (local) resolvedSource = local;
      }
      previews.push({
        itemKey: row.item_key,
        itemType: row.item_type,
        languageCode: row.language_code,
        queryUsed: row.query_used,
        provider: row.provider,
        source: resolvedSource,
        attributionText: row.attribution_text || 'Unknown attribution',
        updatedAt: row.updated_at,
      });
    }
    return previews;
  }

  async prefetchLikelyLanguageCards(input: {
    languageCode: string;
    languageName: string;
    continueLearning?: { moduleName: string; lessonTitle: string; description: string };
    recommended?: Array<{ id: string; title: string; description: string; type: string }>;
    includeGeneric?: boolean;
  }): Promise<number> {
    const requests: BackgroundImageRequest[] = [];

    if (input.continueLearning) {
      requests.push({
        itemKey: `continue:${input.languageCode}`,
        itemType: 'course',
        languageCode: input.languageCode,
        languageName: input.languageName,
        title: input.continueLearning.moduleName,
        lessonTitle: input.continueLearning.lessonTitle,
        description: input.continueLearning.description,
        topicTags: ['language learning', 'culture'],
        cardType: 'continue_learning',
        mood: 'warm atmospheric',
      });
    }

    for (const card of input.recommended ?? []) {
      requests.push({
        itemKey: `recommended:${input.languageCode}:${card.id}`,
        itemType: 'recommendation',
        languageCode: input.languageCode,
        languageName: input.languageName,
        title: card.title,
        description: card.description,
        topicTags: [card.type, 'study'],
        cardType: card.type,
        mood: 'premium subtle',
      });
    }

    requests.push({
      itemKey: `path:${input.languageCode}`,
      itemType: 'path',
      languageCode: input.languageCode,
      languageName: input.languageName,
      title: `${input.languageName} path progress`,
      topicTags: ['learning path', 'culture', 'architecture'],
      cardType: 'path_progress',
      mood: 'cinematic atmospheric',
    });

    if (input.includeGeneric) {
      requests.push({
        itemKey: `generic:${input.languageCode}:study`,
        itemType: 'study',
        languageCode: input.languageCode,
        languageName: input.languageName,
        title: `${input.languageName} study mood`,
        topicTags: ['study mood', 'desk', 'reading'],
        cardType: 'study',
        mood: 'minimal dark',
      });
    }

    return this.prefetch(requests);
  }

  async getCacheStats(): Promise<{ files: number }> {
    if (!isTauri()) return { files: 0 };
    const dirExists = await exists(ASSETS_DIR, { baseDir: BaseDirectory.AppLocalData });
    if (!dirExists) return { files: 0 };
    const entries = await readDir(ASSETS_DIR, { baseDir: BaseDirectory.AppLocalData });
    return { files: entries.filter((entry) => entry.isFile).length };
  }
}

export const backgroundImageService = new BackgroundImageService();
