# Promotional-material verification

2026-11-12. Scope: articles, social copy, four promotional films, covers and their isolated production source. This is not extension-release, store-approval or channel-publication acceptance.

## Source and environment

- Extension: unmodified 0.2.2 ZIP, SHA-256 `e80a5ab2fab2af6e9e023634588cdf6d5c0b38346105e1e4f8cd6201111e5a6f`, from master `108b9419ba09abc654000e9884b4b3edd22ac3e0` (runtime content unchanged from release source).
- macOS arm64, Chrome 157.0.8103.52, Playwright 1.65.0, isolated temporary profiles; viewport 1200×700, DPR 2, device-pixel capture. Remotion 4.0.536, React 19.2.3, FFmpeg.
- Only fixed repository demo data. Saved configuration disables anomaly animation; Chinese enables four common menu algorithms and English enables Sum/Average. No runtime, help, manifest, theme, release or store metadata changes.

## Checks executed

- Two actual browser flows, Chinese and English: drag-select 3×3; open the native bottom menu and select AVG; resize via the real southeast handle 3×3 → 2×2 → 3×3; copy and read the browser clipboard. All nine copied numbers match `[12000,14000,13000,9800,11000,10000,22000,24000,23000]`, with localized 3×3 success notifications. Blue-light and green-dark states are captured from actual demo controls. The geometry/provenance record is `video/public/captures/layout.json`.
- The smaller range is deliberate: expanding the original sample to 16 round currency values invokes a real rounding-integrity signal. The revised demonstration stays within its simple-statistics story. Detection logic and indicators are not disabled, patched or covered up.
- Independent first review found that distracting signal, small English helper text and a short-cut numbering discontinuity. Source footage was reshot, English helper/CTA/footer text enlarged, short numbering changed to 01/02 → 02/02, and all four films rerendered. Final independent results and file hashes are recorded in `review.md`.
- TypeScript compilation: `cd video && node node_modules/typescript/bin/tsc`; `node --check capture.cjs`; `git diff --check`.
- Article image paths, Chrome installation IDs and feature statements checked against current product source. No internal locale parameter, growth attribution or active-user claim. The 500+ figure is provided by the maintainer, not independently measured.
- Portable production lockfile generated without local dependency links: registry URLs only, no other-project paths or `file:` dependencies.
- Local Remotion Studio on port 3118 returns HTTP 200. The optional skill workbench could not start because its pre-existing `demosrc` is a plain-text link placeholder, so workbench import/parity is not claimed. The provided standalone Studio and editable source remain available.
- Existing tracked product files were compared against the base: all 122 unchanged. Release ZIPs remain outside this change and their known SHA-256 values are retained.

## Repeat media verification

```sh
ffprobe -v error -show_streams -show_format -of json media/hitable-zh-CN-45s.mp4
ffmpeg -v error -i media/hitable-zh-CN-45s.mp4 -f null -
```

Apply to all four MP4s. Expected: H.264/yuv420p, 1920×1080, 30fps, 1350 frames/45s or 450 frames/15s, no audio stream, no decode errors. Captions are burned in; silence is intentional. Key frames are checked from rendered MP4s, including selection, the full menu, resizing, copy feedback, page palettes, boundaries and final CTA. UI footage is real; an editorial pointer makes the recorded gestures visible.

## Production and cleanup

`video/capture.cjs`, fixed source MP4s, used theme PNGs, font/license and `video/src/` are formal production inputs. Final videos and covers are product media. Profiles, frame dumps, contact sheets, temporary tools and full logs are process artifacts and are not added to Git. Only reports are retained as QA records. The local preview may keep its small process log while running; client-managed Codex caches are outside this cleanup.

Modern Web Guidance `motion` was consulted: “Prefer to animate opacity and transform”. Editorial caption motion uses only these properties, with deterministic Remotion frame values rather than wall-clock CSS animation, no flashing, and playback pause controls supplied by Studio/video players. Web scroll/view-transition or reduced-motion runtime branches are not applicable to a fixed exported video; no product-page motion was changed.

## Not performed

No new extension build/version, broad product regression, paid generation, soundtrack, external publishing, Chrome Store update or submission. Previously verified application behavior is not relabeled as newly tested beyond the recorded interactions above. Store availability must be checked before the maintainer's public launch.

## Article workbench and store handoff follow-up

The maintainer requested the direct article title “不离开网页，直接对网页表格进行统计计算”, matching English text, original covers, real existing illustrations, and store/article reuse of both language videos.

- Both local article titles and the README were synchronized. The paired manuscripts, sharing copy, original covers and two localized illustrations per language were saved atomically through the article workbench's required `save_article_editions` workflow. Readback matched the complete text and all six image bindings; Chinese/English publication flags remain false, covers are enabled, and the new draft uses the workbench's editorial style.
- All six images were uploaded through per-file authorized PUT tickets and downloaded again; each returned image matched the original SHA-256. No temporary upload tickets or account credentials are retained in the repository.
- Original 1920×816 article covers and 1920×1080 YouTube thumbnails were rendered in both languages, visually checked, and include an actual green statistics overlay. Design and reusable source are included. TypeScript compilation and `git diff --check` passed. Existing footage, final MP4s and legacy video-cover PNGs retain their previously reviewed hashes; their pixels were not changed.
- Two six-cue UTF-8 SRTs were prepared from the 45-second on-screen text and checked for ordered timestamps within 00:00–00:45. Both upload descriptions include the matching Chrome/product/source URLs; language mappings and official platform references are in `store-video.md`.
- `ffprobe` confirmed both upload masters are progressive H.264 High Profile, yuv420p, 1920×1080/30fps/45s. Top-level MP4 parsing confirmed `moov` before `mdat` in each file. These are local format checks, not a claim that every optional encoding recommendation was imposed or that YouTube has accepted/transcoded them.
- The maintainer explicitly chose to upload the two files and provide YouTube URLs. Video URLs remain pending and are not fabricated in the article. The workbench manuscript/image API provides no native video-file upload; native article-platform insertion and actual embedded playback remain a publishing step. The existing private workbench entry responds with authentication protection; no unauthenticated browser preview was bypassed or claimed.
- No workbench application code, product behavior, release ZIP or store-review state was changed. Validation for this follow-up is limited to content, image rendering/upload/readback and existing-media format checks, so no full product/browser regression or video rerender was repeated.
