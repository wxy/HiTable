# HiTable 0.2.2 store screenshots

正式商店素材：从 `hitable-0.2.2-store.zip` 解压目录加载真实扩展后截取，没有绘制、替换或拼接产品界面。PNG 为 1280×800、DPR 1、全幅、不透明背景，符合 [Chrome 商店截图规格](https://developer.chrome.com/docs/webstore/images)。

每组按以下顺序上传，可自行选择需要的图片：

1. `01-statistics-copy.png`：四边统计、四角手柄、十字高亮及复制行列数提示。
2. `02-algorithm-menu.png`：与按钮同宽、在原位展开的本地化算法菜单。
3. `03-dark-auto-theme.png`：演示页蓝色深底，自动选择对应深色配色，非数值单元格灰显。

| 语言 | 目录 | 演示页语言 | Chrome 原生扩展界面 |
| --- | --- | --- | --- |
| 全球通用英文 | [global-en](global-en) | en | en-US |
| English | [en](en) | en | en-US |
| Deutsch | [de](de) | de | de |
| हिन्दी | [hi](hi) | hi | hi |
| 日本語 | [ja](ja) | ja | ja |
| 한국어 | [ko](ko) | ko | ko |
| Română | [ro](ro) | ro | ro |
| Русский | [ru](ru) | ru | ru |
| 简体中文 | [zh_CN](zh_CN) | zh-CN | zh-CN |
| 繁體中文（香港） | [zh_HK](zh_HK) | zh-HK | zh-TW，Chrome 实际回退 |
| 繁體中文（台灣） | [zh_TW](zh_TW) | zh-TW | zh-TW |

共 33 张；全球英文组是英文素材的独立副本。演示数据及目录中原有英文示例标题按真实界面保留。页面语言通过 `pages/demo.html?locale=<目录名>` 选择，算法菜单和提示使用 Chrome 本身的消息目录，没有模拟 `chrome.i18n`。

## 来源与复现

- macOS arm64，Google Chrome 157.0.8103.39，Playwright 1.65.0；每种语言使用独立临时 profile，未读取日常浏览器数据。
- 扩展版本：0.2.2；运行逻辑为 PR #63 合入后的版本。
- 扩展 ZIP SHA-256：`c1f234f1ed7941ed4905dd8425bb52ccb9c731d8627766be9dfb424f7de5fd35`。
- 自动主题、默认算法；截取前滚动至目标 section 距视口顶部 30px。
- 前两张：股票表 `#demo-sales`，从 rows[1].cells[1] 拖至 rows[6].cells[4]，悬停第六个数据格；按一次 ⌘C，捕获提示，然后待提示消失，打开右上角算法菜单。
- 第三张：清除选区，勾选演示页蓝色背景和深色选项；财务表 `#demo-financial` 从 [1,0] 拖至 [4,3]，悬停第六个数据格。
- macOS 进程语言通过临时启动包装器给 Chrome 传入 `-AppleLanguages "(<语言地区>)"`；不修改系统语言。加载方式为 CDP `Extensions.loadUnpacked`，浏览器启动参数包含 `--enable-unsafe-extension-debugging`，保留扩展支持，省略默认 `about:blank`。

这些 PNG 是正式产品素材，进入 Git；临时 profiles、脚本、日志和缩略联系表在记录验证后清理。没有上传或提交商店审核，最终提审由用户操作。
