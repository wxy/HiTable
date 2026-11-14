# HiTable 0.2.3 — Store submission handoff

Upload `hitable-0.2.3-store.zip` as the new package for the existing HiTable Chrome Web Store item. It contains the complete extension with `manifest.json` at the ZIP root. Final store review submission is performed by the maintainer.

- [Release notes / 发布说明](releases/0.2.3.md): TSV + HTML clipboard copying, Markdown copying, optional statistics with a quick double-press, copy fixes and responsive internal pages.
- [Localized descriptions](store-descriptions/README.md): all ten listing languages describe Ctrl+C / ⌘C and Ctrl+X / ⌘X. Each complete description is below 4,000 characters.
- [Existing screenshots](assets/store/0.2.2/README.md): keep the current three images per language, including the global English fallback. No new screenshots are required for this update.
- Existing promotional tiles remain `assets/tile-2.png` (440×280) and `assets/tile-1.png` (1400×560).
- [Existing videos and upload handoff](promotion/0.2.2/store-video.md): keep the current Chinese and English films. No video rendering, upload or replacement is part of this update.
- Permissions, host access and local data handling remain unchanged; see [submission reference](../package-info.md).

The release ZIP contains runtime files only; listing text, screenshots, videos, production dependencies and verification files are kept outside it. Real Word/Excel paste acceptance is recorded separately from native rich-text checks.

GitHub release availability does not establish Chrome Web Store approval or rollout. After uploading the package and applying the localized text, keep the existing visual assets and submit the version for review.
