/**
 * Generates the stroke-order models behind Script Practice.
 *
 * Script Practice scores a learner's drawing against a model of the character's
 * real strokes. That model set used to be three characters hand-drawn as
 * straight lines, so everything else scored on "did you draw enough points".
 * This pulls real data from two open datasets instead:
 *
 * - Chinese, and the Han characters used in Japanese: Make Me a Hanzi, via the
 *   `hanzi-writer-data` package. Its `medians` are already stroke centrelines,
 *   in a 1024 grid with y measured upward from a -124 baseline.
 * - Japanese kana: KanjiVG, fetched at generation time. Its paths are
 *   centrelines too, but as SVG curves in a 109 grid with y downward, so they
 *   are sampled into points here.
 *
 * Output is written to src/data/scriptModels/<lang>.json in a 1024 grid with y
 * downward, ready to scale to whatever size the canvas is.
 *
 * Run: node scripts/generateScriptModels.mjs
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHINESE_CHARACTERS,
  HIRAGANA,
  JAPANESE_KANJI,
  KATAKANA,
} from './characterSets.mjs';

const require = createRequire(import.meta.url);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(projectRoot, 'src/data/scriptModels');

/** The grid every generated model is expressed in. */
const GRID = 1024;
/** Points kept per stroke. Enough to capture a curve, few enough to stay small. */
const POINTS_PER_STROKE = 8;

/* ------------------------------------------------------------------ *
 * Make Me a Hanzi
 * ------------------------------------------------------------------ */

/**
 * Converts a hanzi-writer median to the output grid.
 *
 * The source measures y upward from a -124 baseline to 900, so `900 - y` puts
 * the top of the glyph at 0 and the bottom at 1024.
 */
function hanziPoint([x, y]) {
  return { x: Math.round(x), y: Math.round(900 - y) };
}

function loadHanziCharacter(character) {
  try {
    return require(`hanzi-writer-data/${character}.json`);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * KanjiVG
 * ------------------------------------------------------------------ */

const KANJIVG_BASE = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji';
/** KanjiVG draws in a 109 grid, y already downward. */
const KANJIVG_GRID = 109;

function kanjivgUrl(character) {
  const code = character.codePointAt(0).toString(16).padStart(5, '0');
  return `${KANJIVG_BASE}/${code}.svg`;
}

/** Splits an SVG path `d` into [command, ...numbers] tuples. */
function parsePathCommands(d) {
  const tokens = d.match(/[MmLlCcSsZzHhVv]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const commands = [];
  let index = 0;
  let current = null;

  while (index < tokens.length) {
    if (/[MmLlCcSsZzHhVv]/.test(tokens[index])) {
      current = tokens[index];
      index += 1;
    }
    if (current === undefined || current === null) break;

    const take = (count) => {
      const values = tokens.slice(index, index + count).map(Number);
      index += count;
      return values;
    };

    switch (current) {
      case 'M': case 'L': commands.push([current, ...take(2)]); break;
      case 'm': case 'l': commands.push([current, ...take(2)]); break;
      case 'H': case 'h': case 'V': case 'v': commands.push([current, ...take(1)]); break;
      case 'C': case 'c': commands.push([current, ...take(6)]); break;
      case 'S': case 's': commands.push([current, ...take(4)]); break;
      case 'Z': case 'z': commands.push([current]); break;
      default: index += 1;
    }

    // After an explicit moveto, repeated coordinate pairs are implicit linetos.
    if (current === 'M') current = 'L';
    else if (current === 'm') current = 'l';
  }

  return commands;
}

function cubicAt(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/** Walks a KanjiVG path, sampling each curve into points along the centreline. */
function samplePath(d) {
  const commands = parsePathCommands(d);
  const points = [];
  let cursor = { x: 0, y: 0 };
  let lastControl = null;

  const push = (point) => {
    const previous = points[points.length - 1];
    if (!previous || Math.hypot(previous.x - point.x, previous.y - point.y) > 0.4) {
      points.push(point);
    }
  };

  for (const [command, ...values] of commands) {
    const relative = command === command.toLowerCase();
    const base = relative ? cursor : { x: 0, y: 0 };

    switch (command.toUpperCase()) {
      case 'M': {
        cursor = { x: base.x + values[0], y: base.y + values[1] };
        lastControl = null;
        push({ ...cursor });
        break;
      }
      case 'L': {
        cursor = { x: base.x + values[0], y: base.y + values[1] };
        lastControl = null;
        push({ ...cursor });
        break;
      }
      case 'H': {
        cursor = { x: base.x + values[0], y: cursor.y };
        lastControl = null;
        push({ ...cursor });
        break;
      }
      case 'V': {
        cursor = { x: cursor.x, y: base.y + values[0] };
        lastControl = null;
        push({ ...cursor });
        break;
      }
      case 'C': {
        const c1 = { x: base.x + values[0], y: base.y + values[1] };
        const c2 = { x: base.x + values[2], y: base.y + values[3] };
        const end = { x: base.x + values[4], y: base.y + values[5] };
        for (let step = 1; step <= 6; step += 1) push(cubicAt(cursor, c1, c2, end, step / 6));
        cursor = end;
        lastControl = c2;
        break;
      }
      case 'S': {
        // The first control point mirrors the previous curve's second one.
        const c1 = lastControl
          ? { x: 2 * cursor.x - lastControl.x, y: 2 * cursor.y - lastControl.y }
          : { ...cursor };
        const c2 = { x: base.x + values[0], y: base.y + values[1] };
        const end = { x: base.x + values[2], y: base.y + values[3] };
        for (let step = 1; step <= 6; step += 1) push(cubicAt(cursor, c1, c2, end, step / 6));
        cursor = end;
        lastControl = c2;
        break;
      }
      default:
        break;
    }
  }

  return points;
}

async function loadKanjiVgCharacter(character) {
  const response = await fetch(kanjivgUrl(character));
  if (!response.ok) return null;
  const svg = await response.text();

  // Only numbered stroke paths carry the glyph; ignore anything else.
  const strokes = [...svg.matchAll(/<path[^>]*\bd="([^"]+)"/g)].map((match) => match[1]);
  if (strokes.length === 0) return null;

  const scale = GRID / KANJIVG_GRID;
  return strokes
    .map((d) =>
      samplePath(d).map((point) => ({
        x: Math.round(point.x * scale),
        y: Math.round(point.y * scale),
      })),
    )
    .filter((points) => points.length >= 2);
}

/* ------------------------------------------------------------------ *
 * Shared
 * ------------------------------------------------------------------ */

/** Resamples a stroke to a fixed number of evenly spaced points. */
function resample(points, count = POINTS_PER_STROKE) {
  if (points.length <= 2) return points;

  const lengths = [0];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
    lengths.push(total);
  }
  if (total === 0) return [points[0], points[points.length - 1]];

  const output = [];
  for (let step = 0; step < count; step += 1) {
    const target = (total * step) / (count - 1);
    let segment = 1;
    while (segment < lengths.length - 1 && lengths[segment] < target) segment += 1;

    const spanStart = lengths[segment - 1];
    const spanLength = lengths[segment] - spanStart;
    const ratio = spanLength === 0 ? 0 : (target - spanStart) / spanLength;
    const from = points[segment - 1];
    const to = points[segment];
    output.push({
      x: Math.round(from.x + (to.x - from.x) * ratio),
      y: Math.round(from.y + (to.y - from.y) * ratio),
    });
  }
  return output;
}

function toModel(character, strokePointLists, extra = {}) {
  return {
    character,
    ...extra,
    strokes: strokePointLists.map((points, index) => ({
      index: index + 1,
      points: resample(points).map((point, order) => ({ x: point.x, y: point.y, t: order })),
    })),
  };
}

/**
 * Romaji for each kana, in the same order as the character sets. Readings for
 * Han characters are deliberately left blank: neither dataset carries pinyin or
 * on/kun readings, and inventing them would put wrong answers in front of a
 * learner.
 */
const KANA_ROMAJI = [
  'a', 'i', 'u', 'e', 'o',
  'ka', 'ki', 'ku', 'ke', 'ko',
  'sa', 'shi', 'su', 'se', 'so',
  'ta', 'chi', 'tsu', 'te', 'to',
  'na', 'ni', 'nu', 'ne', 'no',
  'ha', 'hi', 'fu', 'he', 'ho',
  'ma', 'mi', 'mu', 'me', 'mo',
  'ya', 'yu', 'yo',
  'ra', 'ri', 'ru', 're', 'ro',
  'wa', 'wo', 'n',
];

async function main() {
  mkdirSync(outputDir, { recursive: true });
  const missing = { zh: [], ja: [] };

  // Chinese --------------------------------------------------------------
  const chinese = [];
  for (const character of [...new Set(CHINESE_CHARACTERS)]) {
    const data = loadHanziCharacter(character);
    if (!data?.medians?.length) {
      missing.zh.push(character);
      continue;
    }
    chinese.push(
      toModel(
        character,
        data.medians.map((median) => median.map(hanziPoint)),
        { source: 'makemeahanzi' },
      ),
    );
  }
  writeFileSync(resolve(outputDir, 'zh.json'), `${JSON.stringify(chinese)}\n`);
  console.log(`zh: ${chinese.length} characters (${missing.zh.length} missing)`);

  // Japanese -------------------------------------------------------------
  const japanese = [];

  for (const [set, kind] of [[HIRAGANA, 'hiragana'], [KATAKANA, 'katakana']]) {
    let fetched = 0;
    for (const [position, character] of set.entries()) {
      const strokes = await loadKanjiVgCharacter(character);
      if (!strokes?.length) {
        missing.ja.push(character);
        continue;
      }
      fetched += 1;
      japanese.push(
        toModel(character, strokes, {
          source: 'kanjivg',
          kind,
          reading: KANA_ROMAJI[position],
          meaning: `${kind} ${KANA_ROMAJI[position]}`,
        }),
      );
    }
    console.log(`ja/${kind}: ${fetched}/${set.length} fetched`);
  }

  for (const character of [...new Set(JAPANESE_KANJI)]) {
    const strokes = await loadKanjiVgCharacter(character);
    if (strokes?.length) {
      japanese.push(toModel(character, strokes, { source: 'kanjivg', kind: 'kanji' }));
      continue;
    }
    // Fall back to the Han data, which is the same character in a Chinese
    // glyph form — close enough to practise, and flagged so it is not passed
    // off as the Japanese printed form.
    const data = loadHanziCharacter(character);
    if (!data?.medians?.length) {
      missing.ja.push(character);
      continue;
    }
    japanese.push(
      toModel(character, data.medians.map((median) => median.map(hanziPoint)), {
        source: 'makemeahanzi',
        kind: 'kanji',
      }),
    );
  }

  writeFileSync(resolve(outputDir, 'ja.json'), `${JSON.stringify(japanese)}\n`);
  console.log(`ja: ${japanese.length} characters (${missing.ja.length} missing)`);

  if (missing.zh.length) console.log('missing zh:', missing.zh.join(' '));
  if (missing.ja.length) console.log('missing ja:', missing.ja.join(' '));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
