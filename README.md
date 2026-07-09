# HiTable — Instant Analysis of Web Page Table Data

> Analyze data instantly on web page tables, without leaving the page, without copying data, without Excel.
>
> 无需离开网页、无需复制数据、不用打开 Excel，即可在网页的表格上进行各种统计分析。

![HiTable](assets/logo.png)

![JavaScript](https://img.shields.io/badge/language-JavaScript-blue?style=for-the-badge&color=2196F4)
![License](https://img.shields.io/github/license/wxy/HiTable?style=for-the-badge&color=2196F4)
![Manifest V3](https://img.shields.io/badge/manifest-v3-orange?style=for-the-badge)
![Version](https://img.shields.io/github/package-json/v/wxy/HiTable?style=for-the-badge&color=800080)
![Chrome Web Store](https://img.shields.io/chrome-web-store/stars/gepfjnfkjimhdfemijfnnpefdpocldpc?style=for-the-badge&color=FFA500)

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

- Three-scope anomaly detection: across selection, within column, within row
- 2σ threshold with slow pulse animation in your theme color
- Hover over anomalous cells to see why they were flagged

> - 三重范围异常检测：整个选区 / 列内 / 行内
> - 2σ 阈值 + 主题色慢脉冲闪烁
> - 悬停异常单元格可查看标记原因

### Data Integrity Checks / 数据完整性检测

Six statistical tests for spotting potentially fabricated data:

| Test / 检测 | What it checks / 检测内容 |
|---|---|
| **Benford's Law** / 本福特定律 | First-digit distribution vs natural patterns |
| **Last Digit** / 末位数字 | Uneven last-digit distribution (human bias) |
| **Rounding Preference** / 取整偏好 | Excessive 0/5 endings |
| **Duplicate Detection** / 重复检测 | Unusually frequent values |
| **Ratio Anomaly** / 比例异常 | Near-constant cross-column ratios |
| **Monotonic Sequence** / 单调序列 | Over-linear sorted patterns (auto-fill) |

### Number Format Recognition / 数字格式识别

- Currency symbols: `$`, `€`, `£`, `¥`, `₹`, `₽`
- Magnitude suffixes: `K` (×1,000), `W`/`万` (×10,000), `M` (×1,000,000), `亿` (×100,000,000), `万亿` (×10¹²), `B` (×1,000,000,000)
- Full-width digits: `１２３` → 123
- Percentages: `12.5%` → 0.125
- Statistical results inherit currency prefix and magnitude suffix when consistent

> - 货币符号自动识别
> - 数量级后缀：K（千）、W/万（万）、M（百万）、亿、万亿、B（十亿）
> - 全角数字归一化
> - 百分比自动转换
> - 统计结果继承列/行一致的货币前缀和数量级后缀

### Demo Page / 演示页面

A built-in demo page with 7 sample tables so you can try all features immediately after installation. Access via right-click menu on the extension icon.

> 内置演示页面包含 7 张示例表格，安装后即可体验所有功能。通过扩展图标的右键菜单访问。

### Help Page / 帮助页面

Comprehensive in-extension help covering all features, available in 9 languages.

> 内建帮助页面，覆盖所有功能，支持 9 种语言。

---

## How to Use / 使用方法

1. Click the HiTable icon in your browser toolbar to activate it.
2. Drag your mouse across table cells to select a range of data.
3. Statistics appear on four sides — click corners to cycle algorithms.
4. Press `Esc` to clear. Press `Ctrl+C` to copy. Double-press to copy the entire overlay.
5. Right-click the extension icon → **Config** to customize, **Demo** to try, **Help** to learn more.

> 1. 点击浏览器工具栏中的 HiTable 图标激活
> 2. 在表格上拖拽鼠标选择数据区域
> 3. 四边显示统计结果 — 点击角可切换算法
> 4. 按 `Esc` 清除选择，`Ctrl+C` 复制，快速双击复制整个浮层
> 5. 右键扩展图标 → **配置** 自定义，**演示** 试用，**帮助** 了解更多

[![](docs/assets/screenshot-1.png)](https://github.com/wxy/HiTable)
[![](docs/assets/screenshot-2.png)](https://github.com/wxy/HiTable)

---

## Installation / 安装

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/gepfjnfkjimhdfemijfnnpefdpocldpc?style=for-the-badge&color=2196F4)](https://chromewebstore.google.com/detail/gepfjnfkjimhdfemijfnnpefdpocldpc)

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/gepfjnfkjimhdfemijfnnpefdpocldpc) or load as an unpacked extension from the `manifest.json` in this repository.

> 从 [Chrome 应用商店](https://chromewebstore.google.com/detail/gepfjnfkjimhdfemijfnnpefdpocldpc) 安装，或从此仓库的 `manifest.json` 作为未打包扩展加载。

---

## Privacy / 隐私

HiTable does **not** collect any user data. All data processing happens locally on your computer.

> HiTable **不**收集任何用户数据。所有数据处理均在您的计算机上本地完成。

---

## License / 许可证

[MIT](LICENSE) — Open source.

---

## Feedback / 反馈

Found a bug or have a feature request? [Open an issue](https://github.com/wxy/HiTable/issues) on GitHub.

> 发现 bug 或有功能建议？请在 [GitHub](https://github.com/wxy/HiTable/issues) 上提交 issue。
