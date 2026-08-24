# Scripts

## `generateCurriculumSeed.ts`

Bulk-generates and validates core curriculum content for one language, offline,
and writes it to `src/data/curriculumSeeds/<language>.json`, where
`taskContentService` picks it up as a bundled fallback before ever calling the
network — see `src/services/curriculum/seedPack.ts` for how it's consumed.

```bash
npm run seed:curriculum -- --lang=zh
```

Flags: `--lang=<code>` `--variants=<n, default 1>` `--batch=<n, default 8>`
`--concurrency=<n, default 1>` `--pace=<ms between requests, default 4000>`
`--rounds=<retry rounds for rejected items, default 3>`
`--themes=<start-end, default 1-30>` `--debug`

Idempotent and resumable: re-running only does work for pairs the output file
doesn't already cover, so it's safe to stop and restart, or to run again later to
add more variants.

### Known limitation: script-language reliability

For a language written in a non-Latin script (confirmed so far for Chinese, via
`llama-3.3-70b-versatile`), a single generation attempt has a real, non-trivial
chance of coming back with `expectedAnswer` either blank or written as the
romanization (Pinyin, Romaji, ...) instead of the actual script — even though the
same call gets the surrounding exercise structure, English fields, and
romanization field itself right. This was diagnosed through direct probing (see
git history on `taskContentService.ts` and `contentValidation.ts` around this
script's introduction): it is not a fixable prompt-wording bug, it is a real
per-attempt reliability ceiling of the model on this specific task. It is worse for
exercise types that also need script text embedded in the *prompt*, not just the
answer (`character_reading_match`, `radical_component_identify`,
`tone_pair_identify`, `missing_character_choice`, `classifier_choice`).

The script's multi-round retry (`--rounds`) exists specifically to work around
this: validation correctly rejects a blank or romanized answer, and the rejected
item is queued into the next round rather than treated as terminal, since repeated
sampling of the same request measurably recovers a meaningful share of the misses
over several rounds. Full coverage for a script language is realistically a
multi-hour, many-round run, and even then may not reach 100% for the hardest
exercise types. A **partial** seed pack is never a regression — any key it doesn't
cover falls through to live generation exactly as if no seed pack existed — so
stopping a run early or accepting partial coverage is a legitimate outcome, not a
failure to fix.

If a stronger model becomes available for this task, re-running with `--variants`
bumped up will layer additional validated variants onto whatever is already there.
