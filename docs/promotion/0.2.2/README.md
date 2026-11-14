# HiTable promotion — 0.2.2

Prepared on 2026-11-12. These are review-ready promotional materials, not publication records. The maintainer reports the Chrome update has been submitted; approval or store availability of 0.2.2 is not claimed.

## Read and watch

- [Chinese article](article.zh-CN.md): **不离开网页，直接对网页表格进行统计计算**
- [English article](article.en.md): **Run statistics on web tables without leaving the page**
- **[Chinese 48s store/article film](media/hitable-zh-CN-store.mp4) / [English 48s store/article film](media/hitable-en-store.mp4)** — opening cover and instrumental accompaniment
- [Chinese no-music backup](media/hitable-zh-CN-store-no-music.mp4) / [English no-music backup](media/hitable-en-store-no-music.mp4) — identical picture
- [Original Chinese 45s source edition](media/hitable-zh-CN-45s.mp4) / [original English 45s source edition](media/hitable-en-45s.mp4)
- [Chinese 15s cut](media/hitable-zh-CN-15s.mp4) / [English 15s cut](media/hitable-en-15s.mp4)
- [Chinese cover](media/cover.zh-CN.png) / [English cover](media/cover.en.png)
- [Chinese social copy](social.zh-CN.md) / [English social copy](social.en.md)
- [Production decisions and shot plan](design.md)
- [Chinese article cover](media/article-cover.zh-CN.png) / [English article cover](media/article-cover.en.png)
- [Store/article video upload handoff](store-video.md), including localized YouTube titles, descriptions, thumbnails and optional SRT captions.

Videos are 1920×1080, 30fps, H.264/yuv420p MP4 with burned-in captions. The primary 48-second Chinese/English films embed the localized cover for 3 seconds, followed by the full 45-second demonstration. Both have the same instrumental accompaniment, with a 1-second fade-in and 1.5-second fade-out, and include music attribution in the final card and upload description. Matching no-music backups are provided. The original 45-second and 15-second editions remain silent. There is no narration or SFX. The current masters and article illustrations show four distinct edge calculations (Average, Maximum, Sum and Median), all 15 menu options, scrolling and an actual switch to Standard Deviation. The original silent editions predate this revision. All demonstrations use real extension interactions and fixed built-in sample data, with an editorial pointer to make gestures visible.

The author supplied the origin story and 500+ user figure. That figure appears only in article/social text, not as an active-user claim or a growth claim, and should be refreshed before later reuse.

## Production source

The extension itself is unchanged. All dependencies below belong exclusively to the isolated `video/` production project. They do not build or ship with the extension.

```sh
cd docs/promotion/0.2.2/video
npm ci
npm run studio
npm run render:store
```

The Studio uses port 3118. Two store compositions provide the new 48-second editions; four original video compositions retain the 45-second/15-second timelines. Four still compositions provide the article banners and YouTube thumbnails. `npm run render:store` renders the two no-music pictures once and muxes their shared AAC accompaniment without re-encoding video; `npm run render` exports 45-second/15-second silent cuts from the current source; the archived original files predate the algorithm-coverage revision. FFmpeg is required for both render scripts. Set `CHROME_PATH` if Chrome is installed elsewhere. The source is pinned by `package-lock.json`; the film can also be imported using `src/workbench.ts` into a compatible video-shotcraft workbench.

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
- Music: **Carefree — Kevin MacLeod**, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); [source, changes and attribution](video/public/audio/ATTRIBUTION.md). Keep the credits when publishing.
- No stock footage, paid generation, user accounts or private data used.

## Publishing handoff

Use the article and 48-second store film for a product introduction; use the short copy to introduce it on social channels. The archived 15-second cuts predate the algorithm-coverage revision. Each article has the same Chrome installation target, with the website and source/feedback links as secondary destinations. Confirm the displayed version is available in the store before concentrated 0.2.2 promotion. Final wording, channel selection, publication and any store-video update remain with the maintainer.

The paired article has also been saved to the maintainer's private article workbench with its new direct title, original localized cover and two real screenshots per language; publication flags remain false. The maintainer will upload the two 48-second masters to YouTube and provide the links. No YouTube URL or embedded-player verification is fabricated.
