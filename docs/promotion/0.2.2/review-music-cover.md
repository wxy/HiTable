# HiTable 0.2.2 — 音乐、片头及算法覆盖终检

2026-11-12。独立只读审查；仅更新本报告，未修改实现／媒体，未提交、推送、上传或发布。依据 `video-shotcraft` 的 `final-review.md`、`aesthetic-rules.md` 和 `goal-driven-review`，本轮限定复验“15 种统计”的新增反馈，并确认音乐／署名沿用一致。

**结论：PASS（限定范围）。** 当前最终文件已清楚表达支持 15 种统计、四边可使用不同算法，并通过真实长菜单与 STD 切换展示超出求和／平均值的能力。没有未处理的阻断项。结论绑定末尾四个新 MP4 哈希；不等于试听、真实平台播放、上传或发布通过。

## 阻断项

- 无。上一阶段“算法覆盖表达待修订”的阻断已由本轮实际新帧、完整设置截图及采集记录排除。

## 复验结果与证据

直接从最终 MP4 新抽取两语言各 f0、210、285、300、330、450、660、960、1245、1370；查看原尺寸及缩图。未用上一版临时帧或旧 SSIM 为本版背书。视频仍为 90 帧封面＋1,350 帧演示，合计 1,440 帧／48 秒；本轮重拍了交互素材，不声称与旧演示逐像素相同。

| 编号 | 结论与证据 |
| --- | --- |
| P1／F1 | ✓ 两版 f0 明示“15 种统计”／“15 statistics”，并列中位数、标准差、四分位数；f300／330 再以大号 15 和具体算法名强调。原“容易误认为只有求和／平均值”的表达缺口已补足。 |
| F2／D1 | ✓ f210 的四角真实显示 AVG（上）、MAX（右）、SUM（下）、MED（左），对应中文平均值／最大值／求和／中位数与英文本地化名称；非四角重复同一算法。`layout.json.initialCorners` 与画面吻合。 |
| F3／B2 | ✓ f300 显示菜单上部 CNT、SUM、AVG、MIN 等；f330 显示 MED、STD、Q1、Q3、IQR、SKW、KUR 等下部项目，菜单显然不止两项。`capture.cjs` 使用原生 End 导航；记录中中文 scrollTop 0→135、英文 0→214，页面滚动不变，且 15 个代码唯一。 |
| F4 | ✓ f450 菜单关闭且底边改为“标准差”／“std dev”；f660 调整范围、f960 复制提示及 f1245 深色段继续保留 STD。采集代码断言实际按钮为 STD，剪贴板记录为 `clipboardVerified:true`；本轮未重复执行产品操作。 |
| P3／D2 | ✓ 15 项与 `scripts/active.js` 的 `ALL_ALGORITHMS` 及两语言设置截图一致：CNT、SUM、AVG、MIN、MAX、MED、VAR、STD、RNG、MOD、Q1、Q3、IQR、SKW、KUR。支持数量与默认启用数量分开：视频写明“在设置中启用”／“Enable them in Config.”；采集脚本在独立配置内启用全部 15 项，没有宣称默认全启用。 |
| V1／Q1 | ✓ 六张 `demo-selection`、`demo-menu`、`algorithms-settings` 中英文真实截图语言对应，无假 UI。设置图完整显示全部 15 项及四组分类；选择图表现四种边缘算法，菜单图有真实长列表。它们与视频、字幕及上传说明的算法口径一致。 |
| V2／Q11 | ✓ 四张新题图／16:9 缩略图均明确 15 种，语言、主体及四角与对应视频 f0 一致；标题无裁切，保持平面绿／石墨设计。f1370 的品牌、CTA、网址及音乐署名可辨且无遮挡。长菜单小窗可读性建议见下。 |
| D3 | ✓ 扩展来源 ZIP SHA-256 为 `e80a5ab2fab2af6e9e023634588cdf6d5c0b38346105e1e4f8cd6201111e5a6f`，与采集记录一致；`git diff HEAD -- scripts pages manifest.json dist/hitable-0.2.2-store.zip` 无改动。不将演示配置调整说成扩展功能改动。 |
| A8 | ✓ 当前每语言带音／无音版的压缩 H.264 流哈希相同，无音版确实无音频流。中文视频流 `a24fdc45ababfd9764293e58d57ef70a3971f2eda4573c60f5a88ae0e57b3a74`；英文 `be5b391539c6f87e8b09955ccad53b33730035e00b781bd22e55b0bfe8776520`。 |
| A1／A11 | ✓ 两语言当前 AAC 流均为 `8d1a6ed61e9dacb11065448fd575f61663ebac35958da1a48aad7958f443e23e`，与本次审查前一阶段实测流精确相同。因此该阶段 −22.13 LUFS、−7.71 dBTP、LRA 1.90 LU、无削波、−1.97dB 增益、1 秒淡入／1.5 秒淡出的客观结论仍适用；本轮未无谓重测或把测量当试听。实际为 AAC-LC、48kHz、双声道、48 秒。 |
| A10／H1 | ✓ f1370 仍保留 Carefree／Kevin MacLeod、CC BY 4.0、许可链接及 Edited；两版上传说明和 `ATTRIBUTION.md` 保留完整署名／修改说明。许可来源为[作者曲目页](https://www.incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037)及 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，前一阶段已核对，本轮音轨与署名方案未变。 |
| H2／H3 | ✓ 两份 SRT 均 7 条，8–17.999 秒算法字幕已更新为 15 种及具体例子。四个最终 MP4 独立完整解码均退出 0，无错误输出；均为 48.000000 秒、1,440 帧、H.264 High、1920×1080、30fps、yuv420p。 |

无 Gallery 卡／变体、强节拍卡点、SFX 或配音，相关专项检查不适用。本轮没有重跑旧片 SSIM、产品无关路径或算法正确性测试。

## 建议（非阻断）

- Q11-01：f300／330 的原生长菜单在 1080p 可辨，在 480px 小窗难以逐项读；英文 maximum、skewness 存在原生断词。以后若要逐项教学，可补菜单局部放大镜头。本次大号 15、清楚的算法示例及完整设置截图已承担能力说明，不要求观众在视频里读完所有 15 行，因此不阻断当前目标。
- Q11-02：封面底部示例数据辅助行仍偏细；主标题、15 种声明与实际主体清楚，可留待后续视觉调整。

## 未验证项

- U1：**没有主观试听**。本会话工具不支持音频输入；音色、气质、是否干扰阅读及首尾听觉衔接未验证，技术指标不代替听感。
- U2：未在真实浏览器／系统播放器连续播放，未上传 YouTube，未验收转码质量、未登录嵌入播放或 Chrome Web Store 预览；这些仍由维护者上传后完成。
- U3：本轮没有再次启动扩展进行产品端到端测试，也未独立回读云端文章工作台。关于采集行为，结论来自源代码／断言记录与实际渲染互相印证；不将其写成审查者重跑产品测试。跨环境整片渲染确定性也未验证。

## 可重复检查与过程文件

macOS，本地 `ffmpeg`／`ffprobe` 和 Python 标准库／Pillow。输入为四个最终 MP4、上述六张真实截图、四张封面／缩略图及采集代码／记录。逐帧抽取用 `select=eq(n\,0)+eq(n\,210)+…`；中间输出仅放系统临时目录。

```bash
ffprobe -v error -show_streams -show_format -of json "$FILE"
ffmpeg -v error -i "$FILE" -f null -
ffmpeg -v error -i "$FILE" -map 0:v:0 -c copy -f hash -hash sha256 -
ffmpeg -v error -i "$FILE" -map 0:a:0 -c copy -f hash -hash sha256 -
shasum -a 256 "$FILE"
```

本轮只保留报告；独立新建的临时帧／缩图目录在报告完成后删除，不加入 Git。未删除制作侧输入，未改媒体、实现、文章或其他用户文案。

## 最终 MP4 SHA-256

| 文件（`media/`） | SHA-256 |
| --- | --- |
| `hitable-zh-CN-store.mp4` | `c8bcb0aeb18f3552f6698386e8b2ca870159cb6b8f0e0a20641cc910bb563cc7` |
| `hitable-zh-CN-store-no-music.mp4` | `6e2658972b18da63c72efdb6848604910c6c17a0e1bcdb05035785cdace165b1` |
| `hitable-en-store.mp4` | `574f146e1877e557aef94074aa4a7720485155211cec5cc0c75d90ae4c41c099` |
| `hitable-en-store-no-music.mp4` | `1f13a549204a8b5e08cbd4ff9f5b23fd5364439f13abc23a3d428bd0069b6854` |
