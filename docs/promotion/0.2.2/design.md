# HiTable launch — production decisions

Date: 2026-11-12. Source: HiTable 0.2.2, master 108b9419ba09abc654000e9884b4b3edd22ac3e0.

Mode: autonomous creation, executing the user's approved article/story and 45-second real-interaction outline. No Ink Press/template substitution or additional creative confirmation. No publication or Chrome submission is authorized by this production step. The user reports the store update has been submitted; approval is not assumed.

## Product brief and execution decisions

| Requirement | Execution |
| --- | --- |
| Founder's motivation | A small sum or average while reading a web table; copying is awkward and opening a spreadsheet is unnecessary work for this task. |
| Audience | People reading web reports, price tables or public numeric data. |
| Main benefit | Stay on the page; select cells and get the answer. |
| Essential actions | Real drag selection and four-sided statistics, algorithm menu, corner resizing, real copy notification. |
| Secondary | Brief light/dark and colour-family comparison. |
| Format | 45s, 1920×1080, 30fps, Chinese and English; 15s 1920×1080 social cut, both languages. |
| Data | Only fixed sample values in the repository's public built-in demo; marked as sample data in the frame. No personal browser profile, account, live finance feed, or customer data. |
| Audio | Deliberately silent, caption-first editions for muted social playback. No BGM, synthetic narration or SFX; no audio sourcing or sound-alignment claim. |
| Claims | No active-user claim, growth attribution, fabricated testimonial, compatibility with every table or verified fraud detection. 500+ is user-provided and appears only in article text. |
| Distribution | Local review + PR. Concentrated public promotion waits until the store build is available. |

## Visual direction and tokens

Direction: a clear, flat product demonstration. Real screen captures are the hero. Screenshot-based interaction remains front-facing and legible. Brand frames use green and graphite from the existing product.

- Fonts: product system sans (`-apple-system`, BlinkMacSystemFont, Segoe UI); brand Instrument Sans Bold from the existing promotional design, OFL license included.
- Canvas: #F5F7F5; ink #17251D; muted #52645A; green #167344; fine rules #CCD7CE; dark #14291F. No metallic textures, simulated depth, shake, lens effects, neon, or particle finale.
- 72px main Chinese caption; 64px English caption, wrap to at most two lines; auxiliary ≥36px, English subtitle 46px and CTA 48px, measured in rendered pixels. Product UI is captured at DPR 2 and enlarged as needed; key figures and menu names remain readable.
- Grid: 80px safe margins, stable top brand/step line, stable caption and footage bands. Flat 1px edges. Captions are outside the product capture, never represented as native UI.
- Motion: professional/quiet, 18–24-frame eased caption transitions, no spring overshoot, no constant camera motion. Actual cursor gestures run at human speed. At least 1s hold after key results and final brand.
- Styleframe: existing approved flat promotional identity and real localized captures provide the strict reference; no new visual direction proposed. Final composition frames are checked before rendering.

## Function-to-shot mapping

The installed shot library is scanned before implementation. The required content is continuous 2D real interaction; custom footage framing and caption transitions are used instead of a cinematic card effect. No Gallery card/variant is claimed or approximated. This deliberately omits aesthetic Q7/Q8 physical depth/particle spectacle in favour of the user's flat visual language. Page texture/cutout and geometry records accompany the capture.

| Shot | Time / frames | Page and action | Caption intent | Transition / sound |
| --- | --- | --- | --- | --- |
| 1 | 0–5s / 0–149 | Financial demo with a small numeric area; real drag begins and results appear | What do these numbers add up to? | Stable view; silent |
| 2 | 5–15s / 150–449 | Same selection; open a real algorithm menu and choose Average | Choose the calculation by name | Eased caption; silent |
| 3 | 15–25s / 450–749 | Grab a real corner handle, shrink to 2×2 and expand to 3×3, staying below the unrelated rounding-check threshold | Adjust the range right here | Stable capture; silent |
| 4 | 25–34s / 750–1019 | Real clipboard shortcut; show native dimensions toast | Copy when you need the data elsewhere | Eased caption; silent |
| 5 | 34–40s / 1020–1199 | Real blue-light and green-dark demo states | Clear on light and dark pages | One dissolve; silent |
| 6 | 40–45s / 1200–1349 | Brand, tagline and website | HiTable; install in Chrome | ≥1s final hold; silent |

Social cut: 0–5s drag/select; 5–10s resize; 10–15s brand/CTA. Uses the same captured actions, not a fabricated product interaction. Captions and native menus are localized in each language. Cursor overlay in the recording is an editorial pointer aid, not product functionality.

## Asset and QA policy

Capture scripts and product media are formal source assets. Browser profiles, complete recordings before trimming, still/contact-sheet QA, downloaded tooling and logs stay in the task's system temporary directory and are deleted after the report is recorded. Only final media, source inputs actually used by the videos, editable production code, articles and concise reports enter Git. No changes to extension runtime, manifest, store ZIPs or release metadata.
