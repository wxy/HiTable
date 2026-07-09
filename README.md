# HiTable — Instant Analysis of Web Page Table Data

> Analyze data instantly on web page tables, without leaving the page, without copying data, without Excel.
>
> 无需离开网页、无需复制数据、不用打开 Excel，即可在网页的表格上进行各种统计分析。

![HiTable](assets/logo.png)

![JavaScript](https://img.shields.io/badge/language-JavaScript-blue?style=for-the-badge&color=2196F4)
![License](https://img.shields.io/github/license/wxy/HiTable?style=for-the-badge&color=2196F4)

![Manifest Version](https://img.shields.io/github/manifest-json/v/wxy/HiTable?style=for-the-badge&color=FFA500)
![Chrome Web Store Rating](https://img.shields.io/chrome-web-store/stars/gepfjnfkjimhdfemijfnnpefdpocldpc?style=for-the-badge&color=FFA500)

![Supported Locales](https://img.shields.io/badge/Supported%20Locales-en%20%7C%20zh(CN%2FHK%2FTW)%20%7C%20DE%20%7C%20RU%20%7C%20JA%20%7C%20KO%20%7C%20HI-blue?style=for-the-badge&color=8bc34a)

![Release](https://img.shields.io/github/v/release/wxy/HiTable?style=for-the-badge&color=800080)
![Last Commit](https://img.shields.io/github/last-commit/wxy/HiTable?style=for-the-badge&color=800080)
![Code Size](https://img.shields.io/github/languages/code-size/wxy/HiTable?style=for-the-badge&color=800080)

![Stars](https://img.shields.io/github/stars/wxy/HiTable?style=for-the-badge&color=00008B)
![Forks](https://img.shields.io/github/forks/wxy/HiTable?style=for-the-badge&color=00008B)
![Watchers](https://img.shields.io/github/watchers/wxy/HiTable?style=for-the-badge&color=00008B)
![Contributors](https://img.shields.io/github/contributors/wxy/HiTable?style=for-the-badge&color=00008B)

![Closed Issues](https://img.shields.io/github/issues-closed/wxy/HiTable?style=for-the-badge&color=FF0000)
![Closed PRs](https://img.shields.io/github/issues-pr-closed/wxy/HiTable?style=for-the-badge&color=FF0000)

---

## Features / 功能

### Table Support / 表格支持

- **Standard HTML tables** — including complex ones with merged cells (rowspan/colspan)
- **Nested tables** — tables inside tables, recursively flattened into one unified grid
- **Div-based tables** — CSS Grid / Flexbox layouts detected by class patterns and geometric analysis
- **ARIA grids** — elements with `role="grid"` or `role="table"` detected via semantic markers

> - **标准 HTML 表格** — 包括含合并单元格（rowspan/colspan）的复杂表格
> - **嵌套表格** — 表格中的表格，递归展开为统一网格
> - **Div 表格** — CSS Grid / Flexbox 布局，通过类名模式和几何分析检测
> - **ARIA 表格** — 带有 `role="grid"` 或 `role="table"` 的元素，通过语义标记检测

### 15 Statistics Algorithms / 15 种统计算法

| Category / 分类 | Algorithms / 算法 |
|---|---|
| Basic / 基础 | CNT (Count), SUM (Sum), AVG (Average), MIN (Minimum), MAX (Maximum), RNG (Range) |
| Advanced / 高级 | MED (Median), STD (Standard Deviation), VAR (Variance), MOD (Mode) |
| Quantile / 分位数 | Q1 (25%), Q3 (75%), IQR (Interquartile Range) |
| Distribution / 分布 | SKW (Skewness), KUR (Kurtosis) |

### Conditional Formatting & Anomaly Detection / 条件格式化与异常检测

- Three-scope anomaly detection: across the entire selection, within each column, and within each row
- Values deviating from the mean by more than 2× standard deviation are highlighted with a slow pulsing animation
- Hover over anomalous cells to see the reason (global / column / row) and specific deviation values
- Toggle on/off in the configuration page

> - 三重范围异常检测：整个选区 / 列内 / 行内
> - 偏离均值 2 倍标准差以上的值以慢脉冲动画高亮
> - 悬停异常单元格可查看标记原因和具体偏离值
> - 可在配置页面开关

### Data Integrity Checks / 数据完整性检测

Six statistical tests to help identify potentially fabricated data. Results appear as a ⚠ indicator below the overlay. Problematic cells are visually marked with colored outlines.

| Test / 检测 | What it checks / 检测内容 |
|---|---|
| **Benford's Law** / 本福特定律 | First-digit distribution vs natural patterns |
| **Last Digit** / 末位数字 | Uneven last-digit distribution (human bias in randomization) |
| **Rounding Preference** / 取整偏好 | Excessive 0/5 endings (common in manually filled data) |
| **Duplicate Detection** / 重复检测 | Unusually frequent values (possible copy-paste) |
| **Ratio Anomaly** / 比例异常 | Near-constant cross-column ratios (may be formula-generated) |
| **Monotonic Sequence** / 单调序列 | Over-linear sorted patterns (possible auto-fill) |

> 六项统计检测帮助发现潜在造假数据。结果以 ⚠ 指示器显示在浮层下方，问题单元格有彩色边框标记。

### Number Format Recognition / 数字格式识别

- Currency symbols: `$`, `€`, `£`, `¥`, `₹`, `₽`, `HK$`, `NT$`
- Magnitude suffixes: `K` (×1,000), `W`/`万` (×10,000), `M` (×1,000,000), `亿` (×100,000,000), `万亿` (×10¹²), `B` (×1,000,000,000)
- Full-width digits: `１２３` → 123
- Percentages: `12.5%` → 0.125
- Statistical results inherit currency prefix and magnitude suffix when consistent across a column or row
- Column types (integer, decimal, currency, percentage) shown in tooltips

> - 货币符号自动识别
> - 数量级后缀：K（千）、W/万（万）、M（百万）、亿、万亿、B（十亿）
> - 全角数字归一化（１２３ → 123）
> - 百分比自动转换
> - 统计结果继承列/行一致的货币前缀和数量级后缀
> - 列类型标注（整数/小数/货币/百分比）显示在 tooltip 中

### Demo & Help / 演示与帮助

- **Demo Page**: 7 sample tables built right into the extension. Right-click the extension icon → **Demo** to try all features immediately.
- **Help Page**: Comprehensive in-extension help covering all features, available in 9 languages. Right-click → **Help**.

> - **演示页面**：内置 7 张示例表格，右键扩展图标 → **演示** 即可体验所有功能
> - **帮助页面**：内建完整帮助，覆盖所有功能，支持 9 种语言。右键 → **帮助**

---

## How to Use / 使用方法

1. **Activate**: Click the HiTable icon in your browser toolbar. The icon turns green when active.
2. **Select**: Drag your mouse across table cells to select a rectangular range.
3. **View**: Statistics appear on all four sides of the selection. Each edge shows the statistic for each row or column.
4. **Cycle algorithms**: Click any of the four corners to switch between available statistics.
5. **Copy data**: Press `Ctrl+C` (Mac: `⌘C`) to copy the selected cells. Press it **twice quickly** to copy the entire overlay including statistics.
6. **Quick select**: Hold `Shift` while clicking the top-left cell of a table to select the entire table.
7. **Clear**: Click outside the selection or press `Esc` to dismiss the overlay.

> 1. **激活**：点击浏览器工具栏中的 HiTable 图标，图标变绿表示已激活
> 2. **选择**：在表格上拖拽鼠标选择一个矩形区域
> 3. **查看**：四边显示统计结果，每个边分别统计每一行或每一列
> 4. **切换算法**：点击四个角可以在可用统计中切换
> 5. **复制数据**：按 `Ctrl+C`（Mac: `⌘C`）复制选中单元格；**快速双击**复制整个浮层（含统计数据）
> 6. **快速全选**：按住 `Shift` 点击表格左上角单元格即可选择整个表格
> 7. **清除**：点击选择区外或按 `Esc` 键关闭浮层

Non-numeric cells are marked with ~~strikethrough~~ and skipped in calculations. Moving the mouse within the selected area highlights a cross-hair to help match rows and columns to their statistics.

> 非数值单元格以 ~~删除线~~ 标记并在计算时跳过。在选择区域内移动鼠标会高亮十字线，帮助对应行列与统计结果。

The extension supports two activation modes: **Manual** (click to activate per tab) and **Auto** (automatically activates on specific domains).

> 扩展支持两种激活模式：**手动**（点击激活每个标签页）和**自动**（在特定域名自动激活）。

[![](docs/assets/screenshot-1.png)](https://github.com/wxy/HiTable)
[![](docs/assets/screenshot-2.png)](https://github.com/wxy/HiTable)

---

## Configuration / 配置

Right-click the extension icon → **Config** to open the configuration page. You can customize:

- **Activation Mode**: Manual or Auto
- **Theme Color**: Choose from 10 colors for the selection and overlay
- **Enabled Algorithms**: Select which statistics appear in the corner cycling
- **Default Algorithms**: Set the default statistic for each edge (top, right, bottom, left)
- **Conditional Formatting**: Toggle anomaly highlighting on/off

> 右键扩展图标 → **配置** 打开配置页面，可自定义：
> - 激活模式、主题颜色（10 种）、启用的算法、四边默认算法、条件格式化开关

[![](docs/assets/config-en.png)](https://github.com/wxy/HiTable)

---

## Installation / 安装

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/gepfjnfkjimhdfemijfnnpefdpocldpc?style=for-the-badge&color=2196F4)](https://chromewebstore.google.com/detail/gepfjnfkjimhdfemijfnnpefdpocldpc)

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/gepfjnfkjimhdfemijfnnpefdpocldpc) or load as an **unpacked extension** from this repository.

> 从 [Chrome 应用商店](https://chromewebstore.google.com/detail/gepfjnfkjimhdfemijfnnpefdpocldpc) 安装，或从此仓库作为**未打包扩展**加载。

---

## Development / 开发

```bash
git clone https://github.com/wxy/HiTable.git
# Load the repository folder as an unpacked extension in chrome://extensions
# Run automated tests: open chrome-extension://<ext-id>/pages/test.html
```

---

## Privacy / 隐私

HiTable does **not** collect any user data. All data processing happens locally on your computer. No network requests are made to any external service.

> HiTable **不**收集任何用户数据。所有数据处理均在您的计算机上本地完成，不向任何外部服务发送网络请求。

---

## License / 许可证

[MIT](LICENSE) — Open source / 开源软件.

---

## Feedback / 反馈

Found a bug or have a feature request? [Open an issue](https://github.com/wxy/HiTable/issues) on GitHub.

> 发现 bug 或有功能建议？请在 [GitHub](https://github.com/wxy/HiTable/issues) 上提交 issue。
