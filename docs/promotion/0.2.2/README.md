# HiTable promotion — 0.2.2

Prepared on 2026-11-12. These are review-ready promotional materials, not publication records. The maintainer reports the Chrome update has been submitted; approval or store availability of 0.2.2 is not claimed.

## Read and watch

- [Chinese article](article.zh-CN.md): **只是想算个总数，为什么还要打开 Excel？**
- [English article](article.en.md): **Just a quick sum. Do I really need to open Excel?**
- [Chinese 45s film](media/hitable-zh-CN-45s.mp4) / [English 45s film](media/hitable-en-45s.mp4)
- [Chinese 15s cut](media/hitable-zh-CN-15s.mp4) / [English 15s cut](media/hitable-en-15s.mp4)
- [Chinese cover](media/cover.zh-CN.png) / [English cover](media/cover.en.png)
- [Chinese social copy](social.zh-CN.md) / [English social copy](social.en.md)
- [Production decisions and shot plan](design.md)

Videos are 1920×1080, 30fps, H.264/yuv420p MP4, with burned-in captions and no audio. No narration, BGM or SFX is intended. The four long/short language editions use real extension interactions and fixed built-in sample data; these are not generated UI mockups. A small editorial pointer makes the actual gestures visible.

The author supplied the origin story and 500+ user figure. That figure appears only in article/social text, not as an active-user claim or a growth claim, and should be refreshed before later reuse.

## Production source

The extension itself is unchanged. All dependencies below belong exclusively to the isolated `video/` production project. They do not build or ship with the extension.

```sh
cd docs/promotion/0.2.2/video
npm ci
npm run studio
npm run render
```

The Studio uses port 3118. Four compositions provide the two languages and durations. Set `CHROME_PATH` if Chrome is installed elsewhere. The source is pinned by `package-lock.json`; the film can also be imported using `src/workbench.ts` into a compatible video-shotcraft workbench.

The optional capture step needs Chrome with CDP `Extensions.loadUnpacked`, Python 3, FFmpeg and the matching release ZIP:

```sh
HITABLE_PACKAGE=/absolute/path/hitable-0.2.2-store.zip npm run capture
```

Capture creates an isolated profile under the system temporary directory. `HITABLE_CAPTURE_TMP` can select a disposable directory; `HITABLE_CAPTURE_LOCALES=en` reshoots only English. Delete the temporary profiles/frame folders after recording the verification result. The actual source package is SHA-256 `e80a5ab2fab2af6e9e023634588cdf6d5c0b38346105e1e4f8cd6201111e5a6f`.

`video/public/captures/layout.json` records source provenance, viewport/geometry, source footage dimensions and actual clipboard checks. The Chinese menu is configured with four common algorithms; English uses Sum/Average to keep its narrow native menu legible. This is normal saved configuration, not a rewritten product menu. The captured source MP4s and light/dark screenshots are production inputs used by the film. Raw frame dumps and unused screenshots are not retained in Git.

## Credits

- HiTable code and sample page: this repository, MIT.
- Instrument Sans Bold: SIL Open Font License; license included beside the font. Chinese and UI text use the system sans font, which is rendered but not redistributed.
- Production workflow: [video-shotcraft](https://vincentwei1021.github.io/video-shotcraft/), autonomous real-interaction film. No Ink Press or Gallery variant is claimed.
- No third-party music, stock footage, paid generation, user accounts or private data used.

## Publishing handoff

Use the article and 45-second film for a product introduction; use the 15-second cut and short copy for social posts. Each article has the same Chrome installation target, with the website and source/feedback links as secondary destinations. Confirm the displayed version is available in the store before concentrated 0.2.2 promotion. Final wording, channel selection, publication and any store-video update remain with the maintainer.
