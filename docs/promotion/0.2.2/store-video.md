# Chrome Web Store / article video handoff

Checked against official documentation on 2026-11-12. The maintainer will upload the two videos to YouTube and provide their URLs. No video upload, store-listing edit or publication is performed here.

## The two shared masters

| Language | Upload file | Thumbnail | Upload text | Captions |
| --- | --- | --- | --- | --- |
| 简体中文 | [45-second Chinese master](media/hitable-zh-CN-45s.mp4) | [Chinese thumbnail](media/youtube-thumbnail.zh-CN.png) | [中文标题与简介](youtube-upload.zh-CN.txt) | [Chinese SRT](media/hitable-zh-CN-45s.srt) |
| English | [45-second English master](media/hitable-en-45s.mp4) | [English thumbnail](media/youtube-thumbnail.en.png) | [English title and description](youtube-upload.en.txt) | [English SRT](media/hitable-en-45s.srt) |

Both are 16:9, 1920×1080, 30fps, H.264 High Profile, progressive, yuv420p MP4. The `moov` atom precedes `mdat` (Fast Start). The films intentionally have no audio and include readable burned-in text. Optional SRT files mirror the on-screen captions. Existing media bytes remain unchanged; a second encode would provide no benefit for this handoff.

The same 45-second files are intended for the store and articles. The 15-second cuts remain optional social material. This is a product demonstration of actual selection, statistics, resizing and copy feedback with sample data; it makes no version-availability or user-growth claim.

## Chrome Web Store setup after upload

Chrome Web Store accepts a **YouTube video URL**, rather than an MP4 file upload. Its Store listing page supports localized promotional videos.

1. Upload the Chinese and English master separately to the maintainer's YouTube channel. Use the corresponding title, description, thumbnail and language. SRT upload is optional because visible captions are already burned in.
2. Choose Public or Unlisted as appropriate. Unlisted can be viewed by anyone with its link; Private does not provide the same public playback access. Keep **Allow embedding** enabled.
3. After YouTube processing, check the complete video at 1080p, including text and the final CTA, and check that an embedded player can play it without a channel-owner login.
4. In Chrome Web Store Developer Dashboard → HiTable → Store listing, use the **English URL as the global promotional video**; use the **Chinese URL for 简体中文 / zh_CN** and the same English URL for English if setting that localized field. Other locales may use the global video. The Chinese master contains Simplified Chinese UI, so no Traditional Chinese video is claimed.
5. Check the store preview for each configured locale. Final store changes and submission remain with the maintainer.

| Destination | URL status |
| --- | --- |
| Global / English | Awaiting maintainer's English YouTube URL |
| 简体中文 / zh_CN | Awaiting maintainer's Chinese YouTube URL |

## Article use

- Use [the Chinese article cover](media/article-cover.zh-CN.png) and Chinese video for Chinese content; use [the English cover](media/article-cover.en.png) and English video for English content.
- Both article editions, their covers and two real localized illustrations per edition have been saved as an unpublished paired draft in the article workbench. The article title is now direct and descriptive: “不离开网页，直接对网页表格进行统计计算”.
- A suitable video insertion point is immediately after the introductory paragraph naming HiTable, before the first section. In an editor with native video insertion, upload the corresponding MP4 there. The workbench's current manuscript/image API does not upload video or create a native WeChat video component through rich-text copy.
- Once the YouTube URLs are supplied, they can be added as video links in the manuscript or used by an article platform that supports YouTube embedding. Do not fabricate IDs or add a local filesystem path to the cloud article.

## Sources and verification boundary

- [Chrome: complete your listing information](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) — YouTube URL, localized promotional video fields, local/global display order.
- [YouTube recommended encoding settings](https://support.google.com/youtube/answer/1722171?hl=en) — MP4, H.264, progressive frames, 4:2:0 and Fast Start.
- [YouTube privacy settings](https://support.google.com/youtube/answer/157177?hl=en) — Public / Unlisted / Private visibility.
- [YouTube embedding](https://support.google.com/youtube/answer/171780?hl=en) — embedding and the Allow embedding setting.

Local metadata, top-level MP4 atom order and the already-reviewed video hashes were checked. The existing films passed full decoding and independent visual review; their pixels have not changed. Real YouTube ingestion, processed-video quality and Chrome Store embedded playback are **pending the maintainer's upload**, not claimed as passed. No requirement to make a fresh extension version follows from producing these assets.
