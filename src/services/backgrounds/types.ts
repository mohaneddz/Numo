export type BackgroundProviderName = 'pexels' | 'pixabay' | 'unsplash';

export type BackgroundCardType =
  | 'course'
  | 'lesson'
  | 'path'
  | 'recommendation'
  | 'immersion'
  | 'study'
  | 'review'
  | 'generic';

export interface BackgroundImageRequest {
  itemKey: string;
  itemType: BackgroundCardType;
  languageCode?: string;
  languageName?: string;
  country?: string;
  city?: string;
  lessonTitle?: string;
  curriculumSlug?: string;
  cefrLevel?: string;
  topicTags?: string[];
  cardType?: string;
  mood?: string;
  title?: string;
  description?: string;
  fallbackAsset?: string;
}

export interface BackgroundQueryTier {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  queries: string[];
}

export interface BackgroundImageCandidate {
  provider: BackgroundProviderName;
  providerImageId: string;
  title: string;
  description: string;
  width: number;
  height: number;
  imageUrl: string;
  downloadUrl: string;
  pageUrl: string;
  colorHex?: string;
  tags: string[];
  photographerName: string;
  photographerUrl?: string;
  attributionText: string;
}

export interface ScoredBackgroundCandidate {
  candidate: BackgroundImageCandidate;
  score: number;
  reasons: string[];
  tierLevel: number;
  query: string;
}

export interface CardBackgroundSelection {
  itemKey: string;
  source: string;
  provider: BackgroundProviderName | 'fallback';
  attributionText: string;
  photographerName?: string;
  sourcePage?: string;
  localRelativePath?: string;
  fromCache: boolean;
}

export interface BackgroundProvider {
  readonly name: BackgroundProviderName;
  readonly enabled: boolean;
  searchImages(query: string, options?: { perPage?: number; signal?: AbortSignal }): Promise<BackgroundImageCandidate[]>;
  getCuratedImages(topic: string, options?: { perPage?: number; signal?: AbortSignal }): Promise<BackgroundImageCandidate[]>;
}

export interface BackgroundMappingPreview {
  itemKey: string;
  itemType: string;
  languageCode: string | null;
  queryUsed: string | null;
  provider: string | null;
  source: string;
  attributionText: string;
  updatedAt: string;
}

export interface BackgroundValidationResult {
  total: number;
  healthy: number;
  missing: Array<{ itemKey: string; localRelativePath: string }>;
}
