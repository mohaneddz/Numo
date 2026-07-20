# Immersion

Immersion is Numo's authentic-content workspace. It uses the standard application structure:

`sidebar | content area | contextual tools`

## Resource library

The `/immerse` route provides three primary tabs:

- **Videos** — documentaries, drama series, travel and culture, and short films.
- **Readings** — real public-domain novels, stories, poetry, plays, and essays.
- **Audio** — real Spanish podcasts, public-domain audiobooks, and interview programs.

Each tab is divided into substantial category sections. Resource cards show title, description, level, duration, progress, and media type.

The right tools panel contains working library controls rather than placeholder analytics:

- Continue the current resource
- Active source status and refresh/configuration actions
- Level filter
- Short, medium, or long duration filter
- Recommended, alphabetical, or shortest-first sorting
- Unstarted-only filtering
- Live result count
- Reset filters

All interactive cards, buttons, selectors, links, and sliders use explicit pointer or disabled cursors through the shared application stylesheet.

### Media caching and performance

Resolved remote thumbnails, book covers, and audio artwork pass through the shared Immersion media cache:

- Cache API persistence for remote image bytes
- In-memory object URL reuse during the current app session
- Deduplication of simultaneous requests for the same asset
- Lazy loading when cards approach the viewport
- Asynchronous image decoding
- Up to 180 cached assets or 120 MB
- Automatic 30-day asset expiry and least-recently-used pruning
- Alternate URL fallback before the designed local card is revealed

Provider metadata uses separate caches: YouTube metadata lasts 24 hours, while Open Library, Gutenberg, and audio artwork metadata last seven days. Public caption tracks are cached through the Cache API. Settings → Media Integrations provides a single action to clear media assets, transcripts, and content metadata.

## Reading experience

Reading uses a white, paper-like canvas with a compact book toolbar. **Expand** renders the reader through a body-level overlay so no sidebar, app header, or transformed layout remains visible. **Fullscreen** uses the native Tauri window fullscreen command on desktop and the browser Fullscreen API as a fallback. Reader typography, line spacing, page width, bilingual layout, reading background, last position, and bookmarks are stored per book. Wide is the default page-width setting.

Catalog and TXT books use multi-passage pages with aligned original and English text. Next and Previous turn pages rather than changing the selected paragraph. A selected paragraph can be translated on demand through the configured language provider. EPUB books use paginated rendering, preserve their CFI reading position, support text selection/highlighting, and store bookmarks as CFI locations.

The reader supports keyboard navigation: Right/Page Down/Space advances, Left/Page Up returns, Home/End moves to the first/last text page, `E` expands, `F` toggles fullscreen, `B` bookmarks, `T` toggles translation, `S` opens reader settings, `D` cycles backgrounds, plus/minus adjusts text size, `?` opens the shortcut reference, and Escape closes or exits the active reader mode.

Settings → Storage contains the **Books Folder** picker. Selecting or refreshing it indexes supported `.epub` and `.txt` files and adds them to Immersion → Readings under **My Books**. EPUB rendering is loaded only when an EPUB is opened so it does not increase the normal startup bundle.

### YouTube integration

The **Settings → Media Integrations** section contains:

- YouTube Data API v3 key
- YouTube relevance region
- A connection-check action

When a key is configured, the Videos and Audio tabs search YouTube once per media category and map real embeddable thumbnails, titles, channel names, IDs, and watch URLs onto the discovery catalog. Cache writes merge video and audio results, and resolved metadata is cached locally for 24 hours to avoid repeatedly spending API quota. The Immersion tools panel can force a refresh.

The key can come from the local desktop settings store or `VITE_YOUTUBE_API_KEY` in an ignored `.env.local` file. Without a key, or when a request fails, the designed gradient media cards remain available. A key restricted to the YouTube Data API should be used.

YouTube category requests are isolated: a failure in one category does not discard successful thumbnails from the others. Failed thumbnail sizes retry through YouTube's standard high-quality thumbnail endpoint before the designed fallback is shown.

## Video and audio study

The `/immerse/:contentId` detail route renders a media workspace for video and audio resources:

- Official YouTube IFrame API streaming player
- Real play/pause, seek, volume, speed, duration, and playback-state synchronization
- Public Spanish/English caption tracks resolved through the installed `yt-dlp` executable without downloading media
- Real-time transcript selection based on stream progress
- Optional translation beneath every transcript line
- Clickable transcript navigation
- Current-line source text and translation
- Grammar or usage explanation for the current line
- Vocabulary extraction
- Replay, slow-playback, save-line, and Notebook actions

Audio resources additionally provide:

- Seekable waveform
- Playback-speed selection
- Volume control
- Current-line looping
- Automatic or manual transcript following
- Sleep timer
- Listening queue

The audio catalog uses real podcast and audiobook titles. Artwork and publisher metadata are resolved from Apple Podcasts/iTunes Search and cached for seven days. Public-domain audiobooks fall back to their Open Library book cover when podcast artwork is unavailable. Each item fails independently and retains a designed fallback.

If a selected source exposes no public captions, streaming remains available and the transcript panel shows an honest unavailable state instead of fabricated text.

## Bilingual reader

Reading resources open a two-column book experience:

- Original language on the left
- English translation on the right
- Synchronized passage selection
- Translation visibility control
- Adjustable font size
- Literary, clean, and monospace typefaces
- Midnight, paper, and sepia reader themes
- Adjustable line spacing
- Focused, comfortable, and wide page widths
- Side-by-side, stacked, original-only, and translation-only layouts
- Current-passage focus mode
- Three highlighting styles
- Save-highlight and Notebook actions
- Chapter and page navigation controls

The reader keeps a small offline bilingual preview for unavailable sources. Persisted highlights, generated explanations, dictionary lookup, and real book pagination remain future work.

### Public-domain books and covers

The Readings catalog contains real Spanish-language public-domain literature, including works by Cervantes, Galdós, Bécquer, Unamuno, Calderón, Lope de Vega, Darío, Quiroga, and others.

- Cover art is resolved from Open Library and cached locally for seven days.
- Missing-cover placeholders are rejected, and cover requests run in small batches so one failed lookup cannot blank the section.
- Reading text is resolved through the Gutenberg catalog and loaded from its plain-text public-domain editions.
- Parsed passages replace the offline preview when the edition loads successfully.
- Reading cards use portrait 3:4 cover proportions.
- English study translations are generated on demand using a configured GROQ key.
- Designed offline covers and preview passages remain available when a source cannot be reached.
