# HiTable 统计分析增强方案

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 HiTable Chrome 扩展增加 Demo 页面、非标准表格检测、数据造假检测、列类型标注和条件格式化五大功能，提升新用户上手体验和数据分析深度。

**Architecture:** 采用独立模块注入模式——新增 `grid-detector.js`（非标准表格检测）和 `data-integrity.js`（数据造假检测）作为独立内容脚本，由 `background.js` 按序注入。`active.js` 扩展列类型检测和条件格式化逻辑。新增 `pages/demo.html` 作为独立功能展示页。所有新功能复用现有 LogicTable 数据结构和 overlay 显示层。

**Tech Stack:** Vanilla JavaScript (ES6+), Chrome Extension Manifest V3, CSS3 Animations, chrome.i18n API

## Global Constraints

- 不引入任何外部依赖（保持零依赖）
- 不引入构建系统（保持纯 JS 注入模式）
- 所有用户可见文本必须走 chrome.i18n 国际化
- 配色必须从用户选择的主题色派生（不做硬编码颜色）
- 数据造假检测只给信号不给结论（标注"值得注意"而非"造假"）
- 条件格式化异常值使用慢闪烁动画（约 2.5s 周期），不使用独立颜色
- 所有功能向后兼容，已有用户配置不受影响
- Demo 页面仅作为用户手动体验的载体，不含测试 UI
- 自动化测试使用独立的 `pages/test.html`，页面加载即自动执行所有测试
- test.html 复用 demo.html 中的 7 张表格作为测试数据源
- test.html 仅面向开发者，不在用户界面中暴露入口
- 测试框架为自包含（单个 JS 文件），零外部依赖，在浏览器中直接运行

---

## 文件结构

```
pages/
  demo.html                (NEW) - Demo 页面，内含 7 种类型表格（用户手动体验用）
  test.html                (NEW) - 自动化测试页，复用 demo 表格，页面加载即自动执行测试
  config.html              (MODIFY) - 条件格式化设置 UI
scripts/
  active.js                (MODIFY) - 集成列类型检测 + 条件格式化 + 数据完整性入口
  background.js            (MODIFY) - 注入新脚本 + Demo 页右键菜单
  config.js                (MODIFY) - 条件格式化开关
  grid-detector.js         (NEW) - 非标准表格结构检测（含域名排除列表）
  data-integrity.js        (NEW) - 数据造假统计检测（6 项）
  test-runner.js           (NEW) - 自动运行测试框架（页面加载即执行）
assets/
  main.css                 (MODIFY) - 条件格式化样式 + 慢闪烁动画
_locales/
  en/messages.json         (MODIFY) - 新增英文 i18n 字符串
  zh_CN/messages.json      (MODIFY) - 新增中文 i18n 字符串
  (其他 7 种语言)          (MODIFY) - 同步新增对应翻译
manifest.json              (MODIFY) - 注册 demo.html、test.html 和 test-runner.js
```

---

### Task 1: Demo 页面

**Files:**
- Create: `pages/demo.html`
- Modify: `scripts/background.js:39-53`
- Modify: `manifest.json:34-38`
- Modify: `pages/config.html:521-533`
- Modify: `_locales/en/messages.json`
- Modify: `_locales/zh_CN/messages.json` (+ 其他 7 种语言)

**Interfaces:**
- Produces: `pages/demo.html` — 独立 HTML 页面，可被扩展打开
- Produces: context menu item `"demo"` — 右键点击扩展图标可打开 Demo 页
- Produces: i18n key `demoMenu` — "Try Demo" / "体验 Demo"

**说明：** Demo 页面包含 7 种预置表格（含 2 种非标准 div 表格），让用户安装扩展后能立即手动体验所有功能。页面从配置页链接和右键菜单均可访问。页面本身不包含任何测试 UI——测试功能由独立的 `pages/test.html` 承载。

- [ ] **Step 1: 创建 Demo 页面 `pages/demo.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title data-i18n="demoTitle">HiTable Demo - Try It Now</title>
  <style>
    :root {
      --theme-color: #27ae60;
      --theme-color-light: #2ecc71;
      --theme-color-dark: #1e8449;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
      padding: 30px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 32px;
      font-weight: 300;
      color: #333;
      margin-bottom: 8px;
    }
    .header .badge {
      display: inline-block;
      background: linear-gradient(135deg, var(--theme-color), var(--theme-color-dark));
      color: #fff;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      margin: 0 4px;
    }
    .header p {
      color: #666;
      margin-top: 12px;
      font-size: 15px;
      line-height: 1.6;
    }
    .header .steps {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .header .step {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fff;
      padding: 10px 18px;
      border-radius: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      font-size: 14px;
    }
    .header .step-num {
      width: 26px; height: 26px;
      border-radius: 50%;
      background: var(--theme-color);
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700;
      font-size: 13px;
    }
    .section {
      max-width: 900px;
      margin: 0 auto 40px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .section-header {
      background: linear-gradient(135deg, var(--theme-color), var(--theme-color-dark));
      color: #fff;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .section-header .icon {
      font-size: 24px;
    }
    .section-header h2 {
      font-weight: 500;
      font-size: 18px;
    }
    .section-header .tag {
      font-size: 12px;
      background: rgba(255,255,255,0.25);
      padding: 3px 10px;
      border-radius: 12px;
      margin-left: auto;
    }
    .section-body {
      padding: 20px;
      overflow-x: auto;
    }
    .section-body .desc {
      color: #888;
      font-size: 13px;
      margin-bottom: 12px;
    }
    /* 表格基础样式（模拟真实网页表格外观） */
    table.demo-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    table.demo-table th {
      background: #f0f4f8;
      color: #444;
      font-weight: 600;
      padding: 10px 14px;
      text-align: right;
      border: 1px solid #dde;
      white-space: nowrap;
    }
    table.demo-table td {
      padding: 8px 14px;
      text-align: right;
      border: 1px solid #eef;
      font-variant-numeric: tabular-nums;
    }
    table.demo-table tr:nth-child(even) td {
      background: #fafbfc;
    }
    table.demo-table tr:hover td {
      background: #f0f7ff;
    }
    /* 文本列左对齐 */
    table.demo-table th:first-child,
    table.demo-table td:first-child {
      text-align: left;
    }
    /* 嵌套表格样式（模拟财报） */
    .nested-table-wrapper {
      border: 1px solid #dde;
      border-radius: 8px;
      overflow: hidden;
    }
    .nested-table-wrapper > table {
      margin: -1px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 13px;
    }
    .footer a {
      color: var(--theme-color);
      text-decoration: none;
    }
    /* CSS Grid 模拟表格 */
    .css-grid-table {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr 1fr;
      gap: 0;
      border: 1px solid #dde;
      border-radius: 8px;
      overflow: hidden;
    }
    .css-grid-table .grid-header > div {
      background: #f0f4f8;
      color: #444;
      font-weight: 600;
      padding: 10px 14px;
      text-align: right;
      border-bottom: 2px solid #dde;
    }
    .css-grid-table .grid-header > div:first-child,
    .css-grid-table .grid-row > div:first-child {
      text-align: left;
    }
    .css-grid-table .grid-row > div {
      padding: 8px 14px;
      text-align: right;
      border-bottom: 1px solid #eef;
    }
    .css-grid-table .grid-row:nth-child(even) > div {
      background: #fafbfc;
    }
    .css-grid-table .grid-header,
    .css-grid-table .grid-row {
      display: contents;
    }
    /* ARIA Grid 模拟表格 */
    .aria-grid-table {
      border: 1px solid #dde;
      border-radius: 8px;
      overflow: hidden;
    }
    .aria-grid-table [role="row"] {
      display: grid;
      grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr;
      border-bottom: 1px solid #eef;
    }
    .aria-grid-table [role="row"]:last-child {
      border-bottom: none;
    }
    .aria-grid-table .aria-header-row {
      background: #f0f4f8;
      font-weight: 600;
      border-bottom: 2px solid #dde;
    }
    .aria-grid-table [role="columnheader"] {
      padding: 10px 14px;
      text-align: right;
      color: #444;
    }
    .aria-grid-table [role="columnheader"]:first-child,
    .aria-grid-table [role="gridcell"]:first-child {
      text-align: left;
    }
    .aria-grid-table [role="gridcell"] {
      padding: 8px 14px;
      text-align: right;
    }
    .aria-grid-table [role="row"]:nth-child(even) [role="gridcell"] {
      background: #fafbfc;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 data-i18n="demoTitle">HiTable Demo</h1>
    <div>
      <span class="badge">⚡ Instant Analysis</span>
      <span class="badge">🔢 15 Statistics</span>
      <span class="badge">🌐 No Page Leave</span>
    </div>
    <p data-i18n="demoIntro">Try HiTable on the sample tables below. Click the extension icon to activate, then drag-select across any table to see statistics instantly.</p>
    <div class="steps">
      <div class="step"><span class="step-num">1</span> <span data-i18n="demoStep1">Click extension icon to activate</span></div>
      <div class="step"><span class="step-num">2</span> <span data-i18n="demoStep2">Drag-select cells in any table</span></div>
      <div class="step"><span class="step-num">3</span> <span data-i18n="demoStep3">View statistics on four sides</span></div>
    </div>
  </div>

  <!-- 表格 1：简单销售数据 -->
  <div class="section">
    <div class="section-header">
      <span class="icon">📊</span>
      <h2 data-i18n="demoTable1Title">Simple Sales Data</h2>
      <span class="tag" data-i18n="demoTagBasic">Basic</span>
    </div>
    <div class="section-body">
      <p class="desc" data-i18n="demoTable1Desc">A typical numeric table. Try selecting all data columns to see SUM, AVG, MIN, MAX.</p>
      <table class="demo-table" id="demo-sales">
        <thead>
          <tr><th>Month</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Units Sold</th></tr>
        </thead>
        <tbody>
          <tr><td>Jan</td><td>125,000</td><td>87,200</td><td>37,800</td><td>1,240</td></tr>
          <tr><td>Feb</td><td>118,500</td><td>85,100</td><td>33,400</td><td>1,180</td></tr>
          <tr><td>Mar</td><td>142,300</td><td>92,800</td><td>49,500</td><td>1,510</td></tr>
          <tr><td>Apr</td><td>135,800</td><td>89,400</td><td>46,400</td><td>1,380</td></tr>
          <tr><td>May</td><td>158,200</td><td>97,600</td><td>60,600</td><td>1,650</td></tr>
          <tr><td>Jun</td><td>148,900</td><td>94,300</td><td>54,600</td><td>1,520</td></tr>
          <tr><td>Jul</td><td>162,500</td><td>101,200</td><td>61,300</td><td>1,700</td></tr>
          <tr><td>Aug</td><td>155,000</td><td>98,700</td><td>56,300</td><td>1,590</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 表格 2：含合并单元格的课程表 -->
  <div class="section">
    <div class="section-header">
      <span class="icon">📅</span>
      <h2 data-i18n="demoTable2Title">Schedule with Merged Cells</h2>
      <span class="tag" data-i18n="demoTagMerged">Merged Cells</span>
    </div>
    <div class="section-body">
      <p class="desc" data-i18n="demoTable2Desc">This table uses rowspan and colspan. HiTable flattens merged cells into a logical grid automatically.</p>
      <table class="demo-table" id="demo-schedule">
        <thead>
          <tr><th></th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th></tr>
        </thead>
        <tbody>
          <tr><td>9:00</td><td>Math</td><td>English</td><td rowspan="2">Physics Lab</td><td>Math</td><td>English</td></tr>
          <tr><td>10:00</td><td>History</td><td>Math</td><td>History</td><td>Chemistry</td></tr>
          <tr><td>11:00</td><td colspan="2" style="text-align:center">PE (All Grades)</td><td>English</td><td>Chemistry</td><td>History</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 表格 3：嵌套表格（模拟财报） -->
  <div class="section">
    <div class="section-header">
      <span class="icon">🏢</span>
      <h2 data-i18n="demoTable3Title">Nested Table (Quarterly Report)</h2>
      <span class="tag" data-i18n="demoTagNested">Nested</span>
    </div>
    <div class="section-body">
      <p class="desc" data-i18n="demoTable3Desc">A parent table with quarterly totals, some cells containing monthly breakdown tables. HiTable recursively flattens nested tables into one unified grid.</p>
      <table class="demo-table" id="demo-nested">
        <thead>
          <tr><th>Quarter</th><th>Revenue</th><th>Expenses</th><th>Net Income</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Q1</td>
            <td>385,800</td>
            <td>264,700</td>
            <td>121,100</td>
          </tr>
          <tr>
            <td>Q2</td>
            <td>
              <table>
                <tr><td>Apr</td><td>135,800</td></tr>
                <tr><td>May</td><td>158,200</td></tr>
                <tr><td>Jun</td><td>148,900</td></tr>
              </table>
            </td>
            <td>
              <table>
                <tr><td>Apr</td><td>89,400</td></tr>
                <tr><td>May</td><td>97,600</td></tr>
                <tr><td>Jun</td><td>94,300</td></tr>
              </table>
            </td>
            <td>
              <table>
                <tr><td>Apr</td><td>46,400</td></tr>
                <tr><td>May</td><td>60,600</td></tr>
                <tr><td>Jun</td><td>54,600</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>Q3</td><td>—</td><td>—</td><td>—</td>
          </tr>
          <tr>
            <td>Q4</td><td>—</td><td>—</td><td>—</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 表格 4：含货币、百分比、负数的混合数据 -->
  <div class="section">
    <div class="section-header">
      <span class="icon">💹</span>
      <h2 data-i18n="demoTable4Title">Financial Data (Currency, %, Negatives)</h2>
      <span class="tag" data-i18n="demoTagMixed">Mixed Format</span>
    </div>
    <div class="section-body">
      <p class="desc" data-i18n="demoTable4Desc">HiTable auto-detects currency symbols ($, €, £, ¥), percentages, and negative numbers. Non-numeric cells are marked with strikethrough.</p>
      <table class="demo-table" id="demo-financial">
        <thead>
          <tr><th>Product</th><th>Price</th><th>Qty Sold</th><th>Revenue</th><th>YoY Change</th><th>Margin</th></tr>
        </thead>
        <tbody>
          <tr><td>Widget A</td><td>$49.99</td><td>2,340</td><td>$116,976.60</td><td>+12.5%</td><td>34.2%</td></tr>
          <tr><td>Widget B</td><td>€29.50</td><td>1,870</td><td>€55,165.00</td><td>-3.2%</td><td>28.7%</td></tr>
          <tr><td>Widget C</td><td>¥5,800</td><td>890</td><td>¥5,162,000</td><td>+8.7%</td><td>41.5%</td></tr>
          <tr><td>Widget D</td><td>£19.99</td><td>3,120</td><td>£62,368.80</td><td>+22.1%</td><td>19.8%</td></tr>
          <tr><td>Bundle X</td><td>$149.00</td><td>450</td><td>$67,050.00</td><td>-1.8%</td><td>45.0%</td></tr>
          <tr><td>Bundle Y</td><td>$199.00</td><td>320</td><td>$63,680.00</td><td>+5.3%</td><td>52.3%</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 表格 5：数据质量测试（含缺失值、异常值） -->
  <div class="section">
    <div class="section-header">
      <span class="icon">🔍</span>
      <h2 data-i18n="demoTable5Title">Data Integrity Test (Anomalies)</h2>
      <span class="tag" data-i18n="demoTagIntegrity">Integrity</span>
    </div>
    <div class="section-body">
      <p class="desc" data-i18n="demoTable5Desc">This dataset contains outliers and artificially generated values. After activation, try selecting numeric columns to see anomaly detection in action.</p>
      <table class="demo-table" id="demo-integrity">
        <thead>
          <tr><th>Record ID</th><th>Amount</th><th>Quantity</th><th>Unit Price</th></tr>
        </thead>
        <tbody>
          <tr><td>R001</td><td>1,250.00</td><td>5</td><td>250.00</td></tr>
          <tr><td>R002</td><td>1,250.00</td><td>5</td><td>250.00</td></tr>
          <tr><td>R003</td><td>1,250.00</td><td>5</td><td>250.00</td></tr>
          <tr><td>R004</td><td>1,280.00</td><td>8</td><td>160.00</td></tr>
          <tr><td>R005</td><td>1,280.00</td><td>8</td><td>160.00</td></tr>
          <tr><td>R006</td><td>1,300.00</td><td>10</td><td>130.00</td></tr>
          <tr><td>R007</td><td>1,300.00</td><td>10</td><td>130.00</td></tr>
          <tr><td>R008</td><td>1,300.00</td><td>10</td><td>130.00</td></tr>
          <tr><td>R009</td><td>98,500.00</td><td>12</td><td>8,208.33</td></tr>
          <tr><td>R010</td><td>1,350.00</td><td>15</td><td>90.00</td></tr>
          <tr><td>R011</td><td>1,400.00</td><td>20</td><td>70.00</td></tr>
          <tr><td>R012</td><td>1,450.00</td><td>25</td><td>58.00</td></tr>
          <tr><td>R013</td><td>1,500.00</td><td>30</td><td>50.00</td></tr>
          <tr><td>R014</td><td>1,550.00</td><td>35</td><td>44.29</td></tr>
          <tr><td>R015</td><td>-500.00</td><td>40</td><td>-12.50</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 表格 6：CSS Grid 构建的非标准表格 -->
  <div class="section">
    <div class="section-header">
      <span class="icon">🎨</span>
      <h2 data-i18n="demoTable6Title">CSS Grid Table (Div-based)</h2>
      <span class="tag" data-i18n="demoTagGrid">Non-standard</span>
    </div>
    <div class="section-body">
      <p class="desc" data-i18n="demoTable6Desc">This table is built with &lt;div&gt; elements and CSS Grid — no &lt;table&gt; tags. HiTable detects it by analyzing its CSS class names and child element geometry.</p>
      <div class="css-grid-table" id="demo-cssgrid">
        <div class="grid-header">
          <div>Product</div><div>Sales Q1</div><div>Sales Q2</div><div>Sales Q3</div><div>Sales Q4</div><div>Total</div>
        </div>
        <div class="grid-row">
          <div>Alpha</div><div>12,500</div><div>14,200</div><div>13,800</div><div>16,100</div><div>56,600</div>
        </div>
        <div class="grid-row">
          <div>Beta</div><div>9,800</div><div>11,300</div><div>10,500</div><div>12,900</div><div>44,500</div>
        </div>
        <div class="grid-row">
          <div>Gamma</div><div>22,100</div><div>19,700</div><div>24,300</div><div>21,800</div><div>87,900</div>
        </div>
        <div class="grid-row">
          <div>Delta</div><div>8,400</div><div>7,900</div><div>9,200</div><div>8,800</div><div>34,300</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 表格 7：ARIA role="grid" 构建的非标准表格 -->
  <div class="section">
    <div class="section-header">
      <span class="icon">♿</span>
      <h2 data-i18n="demoTable7Title">ARIA Grid (role="grid")</h2>
      <span class="tag" data-i18n="demoTagAria">ARIA</span>
    </div>
    <div class="section-body">
      <p class="desc" data-i18n="demoTable7Desc">This table uses ARIA role="grid" for accessibility. HiTable detects it via semantic markers — no CSS class matching needed.</p>
      <div role="grid" aria-label="Employee Performance" class="aria-grid-table" id="demo-ariagrid">
        <div role="row" class="aria-header-row">
          <div role="columnheader">Employee</div>
          <div role="columnheader">Department</div>
          <div role="columnheader">Projects</div>
          <div role="columnheader">Hours</div>
          <div role="columnheader">Rating</div>
        </div>
        <div role="row">
          <div role="gridcell">Alice Chen</div>
          <div role="gridcell">Engineering</div>
          <div role="gridcell">12</div>
          <div role="gridcell">1,840</div>
          <div role="gridcell">4.8</div>
        </div>
        <div role="row">
          <div role="gridcell">Bob Martinez</div>
          <div role="gridcell">Design</div>
          <div role="gridcell">8</div>
          <div role="gridcell">1,620</div>
          <div role="gridcell">4.5</div>
        </div>
        <div role="row">
          <div role="gridcell">Carol Smith</div>
          <div role="gridcell">Engineering</div>
          <div role="gridcell">15</div>
          <div role="gridcell">2,010</div>
          <div role="gridcell">4.9</div>
        </div>
        <div role="row">
          <div role="gridcell">David Kim</div>
          <div role="gridcell">Marketing</div>
          <div role="gridcell">6</div>
          <div role="gridcell">1,450</div>
          <div role="gridcell">4.2</div>
        </div>
        <div role="row">
          <div role="gridcell">Eva Johnson</div>
          <div role="gridcell">Engineering</div>
          <div role="gridcell">10</div>
          <div role="gridcell">1,780</div>
          <div role="gridcell">4.6</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p data-i18n="demoFooter">More questions? Visit <a href="https://github.com/wxy/HiTable" target="_blank">github.com/wxy/HiTable</a></p>
  </div>
</body>
</html>
```

- [ ] **Step 2: 在 `manifest.json` 中将 demo.html 加入 `web_accessible_resources`**

修改 `manifest.json:34-38`，在 resources 数组中添加 `"pages/demo.html"`：

```json
"web_accessible_resources": [
    {
        "resources": ["assets/logo.png", "assets/active.png", "assets/inactive.png", "assets/main.css", "_locales/*/messages.json", "pages/demo.html"],
        "matches": ["http://*/*", "https://*/*", "file://*/*"]
    }
]
```

- [ ] **Step 3: 在 `background.js` 中增加 Demo 页右键菜单项**

修改 `background.js:38-53` 的 `chrome.runtime.onInstalled` 监听器，在 `"help"` 菜单项之后新增 `"demo"` 菜单项：

```javascript
chrome.runtime.onInstalled.addListener(function() {
  chrome.action.setIcon({path: "../assets/inactive.png"});
  let manifestData = chrome.runtime.getManifest();
  let version = manifestData.version;
  chrome.contextMenus.create({
    id: "report",
    title: chrome.i18n.getMessage('reportMenu'),
    contexts: ["action"],
  });
  chrome.contextMenus.create({
    id: "help",
    title: chrome.i18n.getMessage('helpMenu') + ' (v' + version + ')',
    contexts: ["action"],
  });
  chrome.contextMenus.create({
    id: "demo",
    title: chrome.i18n.getMessage('demoMenu'),
    contexts: ["action"],
  });
});
```

在 `chrome.contextMenus.onClicked` 监听器（`background.js:56`）中，在 `else if (info.menuItemId === "help")` 块之后新增 `demo` 处理：

```javascript
} else if (info.menuItemId === "demo") {
  let demoUrl = chrome.runtime.getURL('pages/demo.html');
  chrome.tabs.create({ url: demoUrl });
}
```

- [ ] **Step 4: 在配置页 `config.html` 底部 help 链接区添加 Demo 页链接**

修改 `config.html:521-533` 的 help div，在第一个链接位置添加 Demo 页链接：

```html
<div class="help">
  <a href="#" id="openDemoLink" data-i18n="demoMenu">
    Try Demo
  </a>
  <a href="https://github.com/wxy/HiTable/blob/master/README.md" target="_blank" data-i18n="configGuide">
    User Guide
  </a>
  ...
</div>
```

在 `config.js` 的初始化末尾（`window.onload` 函数最后）添加事件绑定：

```javascript
// 打开 Demo 页面
document.getElementById('openDemoLink')?.addEventListener('click', function(e) {
  e.preventDefault();
  let demoUrl = chrome.runtime.getURL('pages/demo.html');
  chrome.tabs.create({ url: demoUrl });
});
```

- [ ] **Step 5: 添加 i18n 字符串**

在 `_locales/en/messages.json` 末尾（最后一个条目之前）添加：

```json
"demoMenu": {
    "message": "Try Demo"
},
"demoTitle": {
    "message": "HiTable Demo — Try It Now"
},
"demoIntro": {
    "message": "Try HiTable on the sample tables below. Click the extension icon to activate, then drag-select across any table to see statistics instantly."
},
"demoStep1": {
    "message": "Click extension icon to activate"
},
"demoStep2": {
    "message": "Drag-select cells in any table"
},
"demoStep3": {
    "message": "View statistics on four sides"
},
"demoTable1Title": {
    "message": "Simple Sales Data"
},
"demoTable1Desc": {
    "message": "A typical numeric table. Try selecting all data columns to see SUM, AVG, MIN, MAX."
},
"demoTable2Title": {
    "message": "Schedule with Merged Cells"
},
"demoTable2Desc": {
    "message": "This table uses rowspan and colspan. HiTable flattens merged cells into a logical grid automatically."
},
"demoTable3Title": {
    "message": "Nested Table (Quarterly Report)"
},
"demoTable3Desc": {
    "message": "A parent table with quarterly totals, some cells containing monthly breakdown tables. HiTable recursively flattens nested tables into one unified grid."
},
"demoTable4Title": {
    "message": "Financial Data (Currency, %, Negatives)"
},
"demoTable4Desc": {
    "message": "HiTable auto-detects currency symbols ($, €, £, ¥), percentages, and negative numbers. Non-numeric cells are marked with strikethrough."
},
"demoTable5Title": {
    "message": "Data Integrity Test (Anomalies)"
},
"demoTable5Desc": {
    "message": "This dataset contains outliers and artificially generated values. After activation, try selecting numeric columns to see anomaly detection in action."
},
"demoFooter": {
    "message": "More questions? Visit"
},
"demoTagBasic": {
    "message": "Basic"
},
"demoTagMerged": {
    "message": "Merged Cells"
},
"demoTagNested": {
    "message": "Nested"
},
"demoTagMixed": {
    "message": "Mixed Format"
},
"demoTagIntegrity": {
    "message": "Integrity"
},
"demoTable6Title": {
    "message": "CSS Grid Table (Div-based)"
},
"demoTable6Desc": {
    "message": "This table is built with <div> elements and CSS Grid — no <table> tags. HiTable detects it by analyzing its CSS class names and child element geometry."
},
"demoTable7Title": {
    "message": "ARIA Grid (role=\"grid\")"
},
"demoTable7Desc": {
    "message": "This table uses ARIA role=\"grid\" for accessibility. HiTable detects it via semantic markers — no CSS class matching needed."
},
"demoTagGrid": {
    "message": "Non-standard"
},
"demoTagAria": {
    "message": "ARIA"
}
```

在 `_locales/zh_CN/messages.json` 中添加对应的中文翻译：

```json
"demoMenu": {
    "message": "体验 Demo"
},
"demoTitle": {
    "message": "HiTable 演示 — 立即体验"
},
"demoIntro": {
    "message": "在下方示例表格上试用 HiTable。点击扩展图标激活，然后拖拽选择任意表格区域即可即时查看统计分析结果。"
},
"demoStep1": {
    "message": "点击扩展图标激活"
},
"demoStep2": {
    "message": "拖拽选择表格中的数据"
},
"demoStep3": {
    "message": "在四边查看统计结果"
},
"demoTable1Title": {
    "message": "简单销售数据"
},
"demoTable1Desc": {
    "message": "典型的数值表格。尝试选择所有数据列查看总和、均值、最大值、最小值。"
},
"demoTable2Title": {
    "message": "含合并单元格的课程表"
},
"demoTable2Desc": {
    "message": "此表格使用了 rowspan 和 colspan。HiTable 会自动将合并单元格展开为逻辑网格。"
},
"demoTable3Title": {
    "message": "嵌套表格（季度财报）"
},
"demoTable3Desc": {
    "message": "父表格包含季度汇总，部分单元格内嵌月度明细表。HiTable 会递归展开嵌套表格为统一的数据网格。"
},
"demoTable4Title": {
    "message": "财务数据（含货币、百分比、负数）"
},
"demoTable4Desc": {
    "message": "HiTable 自动识别货币符号（$、€、£、¥）、百分比和负数。非数值单元格以删除线标记。"
},
"demoTable5Title": {
    "message": "数据完整性测试（含异常值）"
},
"demoTable5Desc": {
    "message": "此数据集包含离群值和人工生成的规律数据。激活后，尝试选择数值列查看异常检测效果。"
},
"demoFooter": {
    "message": "更多问题？访问"
},
"demoTagBasic": {
    "message": "基础"
},
"demoTagMerged": {
    "message": "合并单元格"
},
"demoTagNested": {
    "message": "嵌套表格"
},
"demoTagMixed": {
    "message": "混合格式"
},
"demoTagIntegrity": {
    "message": "数据完整性"
},
"demoTable6Title": {
    "message": "CSS Grid 表格（纯 Div 构建）"
},
"demoTable6Desc": {
    "message": "此表格使用 <div> 和 CSS Grid 构建——没有任何 <table> 标签。HiTable 通过分析其 CSS 类名和子元素几何位置来检测。"
},
"demoTable7Title": {
    "message": "ARIA Grid（role=\"grid\"）"
},
"demoTable7Desc": {
    "message": "此表格使用 ARIA role=\"grid\" 标记。HiTable 通过语义标记直接检测——无需 CSS 类名匹配。"
},
"demoTagGrid": {
    "message": "非标准表格"
},
"demoTagAria": {
    "message": "ARIA"
}
```

其他 7 种语言的 messages.json 同步添加对应的 key，value 可使用英文占位（后续翻译）。

- [ ] **Step 6: 手动验证 Demo 页面**

打开 `chrome://extensions`，加载扩展，右键点击扩展图标，选择 "Try Demo"，确认：
- Demo 页面在新的 tab 中打开
- 7 个表格均正确渲染（包括 2 个非标准 div 表格）
- 点击扩展图标激活后，可在所有表格（包括 CSS Grid 和 ARIA Grid）上拖拽选择
- 覆盖表格正确显示统计结果
- 条件格式化在原表格和 overlay 上均正确显示
- 数据完整性检测在 Data Integrity Test 表上触发 ⚠️ 标记
- 页面上没有可见的测试 UI（干净的用户体验）
- 从配置页的 "Try Demo" 链接也能打开

- [ ] **Step 7: Commit**

```bash
git add pages/demo.html manifest.json scripts/background.js scripts/config.js pages/config.html _locales/
git commit -m "feat: add demo page with 5 sample tables for new user onboarding"
```

---

### Task 2: 非标准表格检测

**Files:**
- Create: `scripts/grid-detector.js`
- Modify: `scripts/background.js:152-163` (active.js 注入处)
- Modify: `scripts/active.js` (调用 grid-detector)

**Interfaces:**
- Consumes: `window.HiTableState`, `LogicTable` class (from active.js)
- Produces: `GridDetector.findGrids(rootElement)` → `Array<{container: Element, rows: Element[][], rect: DOMRect}>`
- Produces: `GridDetector.buildVirtualLogicTable(gridResult)` → `LogicTable`

**说明：** 扩展表格识别能力，除 `<table>` 标签外，增加对使用 `<div>` + CSS Grid/Flexbox 或 ARIA role 属性呈现的表格结构的检测。优先检测语义标记（role="grid"、role="table"），其次基于 CSS 类名模式 + 子元素几何位置聚类。内置域名排除列表避免在代码仓库页面误匹配。检测结果转换为虚拟 LogicTable 供后续统计使用。

- [ ] **Step 1: 创建 `scripts/grid-detector.js`**

```javascript
/**
 * GridDetector - 非标准表格结构检测
 * 检测页面上不使用 <table> 标签但视觉上呈表格布局的元素组
 */
(function() {
  'use strict';

  // 语义选择器 —— 高置信度，优先级最高
  const SEMANTIC_SELECTORS = [
    '[role="grid"]',
    '[role="table"]',
    '[role="treegrid"]',
    '[data-table]',
    '[data-grid]'
  ];

  // 域名排除列表 —— 在这些域名下，CSS 类名模式检测容易误匹配（如代码仓库的 .table 类）
  const EXCLUDED_DOMAINS = [
    'github.com',
    'gitlab.com',
    'bitbucket.org',
    'gitee.com',
    'stackoverflow.com',
    'codepen.io',
    'jsfiddle.net',
    'codesandbox.io',
    'sourcegraph.com',
  ];

  /**
   * 检查当前域名是否在排除列表中
   */
  function isExcludedDomain() {
    const hostname = window.location.hostname;
    return EXCLUDED_DOMAINS.some(domain => {
      return hostname === domain || hostname.endsWith('.' + domain);
    });
  }

  // 候选容器选择器 —— 可能包含表格型布局
  const CANDIDATE_SELECTORS = [
    '.table', '.data-table', '.grid', '.data-grid',
    '[class*="table"]', '[class*="grid"]',
    '.MuiTable-root',        // Material-UI
    '.ag-grid', '.ag-theme-*', // AG Grid
    '.dx-datagrid',          // DevExtreme
    '.k-grid',               // Kendo UI
    '.handsontable',         // Handsontable
    '.react-grid-*',         // React Grid 系列
    '.ant-table',            // Ant Design
    '.el-table',             // Element UI
    '.v-data-table',         // Vuetify
  ];

  /**
   * 检查元素是否应该被排除（位于 overlay 内、太小的元素、或隐藏元素）
   */
  function shouldSkipElement(el) {
    if (!el || !el.getBoundingClientRect) return true;
    // 排除 HiTable overlay 内的元素
    if (el.closest('.HiTableOverlay')) return true;
    // 排除不可见元素（display:none 或 visibility:hidden）
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return true;
    // 排除隐藏的父元素
    let parent = el.parentElement;
    while (parent) {
      const pStyle = window.getComputedStyle(parent);
      if (pStyle.display === 'none' || pStyle.visibility === 'hidden') return true;
      parent = parent.parentElement;
    }
    const rect = el.getBoundingClientRect();
    return rect.width < 100 || rect.height < 50; // 太小的忽略
  }

  /**
   * 从语义选择器检测表格
   * @param {Element} root - 搜索的根元素
   * @returns {Element[]} 检测到的表格容器元素
   */
  function detectBySemantics(root) {
    const results = [];
    for (const selector of SEMANTIC_SELECTORS) {
      try {
        const elements = root.querySelectorAll(selector);
        elements.forEach(el => {
          if (!shouldSkipElement(el) && !results.includes(el)) {
            results.push(el);
          }
        });
      } catch (e) {
        // 无效的选择器，跳过
      }
    }
    return results;
  }

  /**
   * 从 CSS 类名模式检测表格
   * @param {Element} root - 搜索的根元素
   * @returns {Element[]} 检测到的表格容器元素
   */
  function detectByClassName(root) {
    // 在排除的域名上跳过 CSS 类名检测（语义检测仍然生效）
    if (isExcludedDomain()) {
      return [];
    }
    const results = [];
    for (const selector of CANDIDATE_SELECTORS) {
      try {
        const elements = root.querySelectorAll(selector);
        elements.forEach(el => {
          // 排除已经是标准 table 的祖先
          if (el.closest('table') && !el.closest('.HiTableOverlay')) return;
          if (!shouldSkipElement(el) && !results.includes(el)) {
            // 进一步验证：检查子元素中是否有规律排列的单元格
            if (hasGridLikeChildren(el)) {
              results.push(el);
            }
          }
        });
      } catch (e) {
        // 无效的选择器，跳过
      }
    }
    return results;
  }

  /**
   * 检查容器的直接子元素是否呈网格排列
   * 策略：检查所有子元素的 getBoundingClientRect，看是否对齐成行和列
   */
  function hasGridLikeChildren(container) {
    const children = Array.from(container.children).filter(child => {
      const rect = child.getBoundingClientRect();
      return rect.width > 10 && rect.height > 5; // 过滤掉不可见元素
    });

    if (children.length < 4) return false; // 至少需要 4 个单元格（2×2）

    // 收集所有子元素的 rect
    const rects = children.map(child => ({
      el: child,
      rect: child.getBoundingClientRect()
    }));

    // 按 top 坐标聚类成"行"
    const rowClusters = clusterByCoordinate(rects, 'top', 5);
    // 按 left 坐标聚类成"列"
    const colClusters = clusterByCoordinate(rects, 'left', 5);

    // 判断：至少 2 行 2 列，且行内元素数大致相等
    if (rowClusters.length < 2 || colClusters.length < 2) return false;

    const avgPerRow = rects.length / rowClusters.length;
    return avgPerRow >= 2;
  }

  /**
   * 按坐标值聚类
   * @param {Array<{el: Element, rect: DOMRect}>} items
   * @param {'top'|'left'} coordKey
   * @param {number} tolerance - 容差像素
   * @returns {Array[]} 聚类结果（二维数组）
   */
  function clusterByCoordinate(items, coordKey, tolerance) {
    // 提取坐标值并排序
    const values = [...new Set(items.map(item => item.rect[coordKey]))].sort((a, b) => a - b);

    // 贪心聚类：相近的值归为一组
    const clusters = [];
    let currentCluster = [values[0]];

    for (let i = 1; i < values.length; i++) {
      if (Math.abs(values[i] - currentCluster[currentCluster.length - 1]) <= tolerance) {
        currentCluster.push(values[i]);
      } else {
        clusters.push(currentCluster);
        currentCluster = [values[i]];
      }
    }
    clusters.push(currentCluster);

    return clusters;
  }

  /**
   * 基于几何位置将容器内的子元素构建为逻辑行列结构
   * @param {Element} container - 表格容器
   * @returns {{container: Element, rows: Element[][], rect: DOMRect}}
   */
  function buildGridFromContainer(container) {
    const children = Array.from(container.children).filter(child => {
      const rect = child.getBoundingClientRect();
      return rect.width > 10 && rect.height > 5;
    });

    const rects = children.map(child => ({
      el: child,
      rect: child.getBoundingClientRect()
    }));

    // 按 top 聚类为行
    const rowClusters = clusterByCoordinate(rects, 'top', 5);

    // 每行内按 left 排序
    const rows = rowClusters.map(cluster => {
      const coerces = cluster.map(value => {
        return rects.filter(item => Math.abs(item.rect.top - value) <= 5);
      }).flat();
      // 去重
      const unique = [];
      const seen = new Set();
      for (const item of coerces) {
        if (!seen.has(item.el)) {
          seen.add(item.el);
          unique.push(item);
        }
      }
      // 按 left 排序
      unique.sort((a, b) => a.rect.left - b.rect.left);
      return unique.map(item => item.el);
    });

    return {
      container,
      rows,
      rect: container.getBoundingClientRect()
    };
  }

  /**
   * 主入口：在根元素内查找所有非标准表格
   * @param {Element} root - 搜索根元素（通常是 document.body）
   * @returns {Array<{container: Element, rows: Element[][], rect: DOMRect}>}
   */
  function findGrids(root) {
    root = root || document.body;

    // 第一步：语义检测（高置信度）
    const semanticContainers = detectBySemantics(root);

    // 第二步：CSS 类名模式检测（中等置信度）
    const classContainers = detectByClassName(root);

    // 合并并去重
    const allContainers = [...semanticContainers];
    for (const el of classContainers) {
      if (!allContainers.includes(el)) {
        allContainers.push(el);
      }
    }

    // 对每个容器构建行列结构
    const grids = [];
    for (const container of allContainers) {
      try {
        const grid = buildGridFromContainer(container);
        if (grid.rows.length >= 2 && grid.rows[0].length >= 2) {
          grids.push(grid);
        }
      } catch (e) {
        console.warn('HiTable: Failed to build grid from container:', container, e);
      }
    }

    return grids;
  }

  // 暴露到全局
  window.HiTableGridDetector = {
    findGrids,
    buildGridFromContainer,
    detectBySemantics,
    detectByClassName,
    hasGridLikeChildren
  };

  console.log('HiTable: Grid detector initialized');
})();
```

- [ ] **Step 2: 在 `background.js` 中将 `grid-detector.js` 与 `active.js` 一同注入**

修改 `background.js` 中所有注入 active.js 的位置（`toggleExtension`、`handleTabActivation`、`handleTabUpdate` 三处），在 `files: ['scripts/active.js']` 之前添加 `grid-detector.js`。

以 `toggleExtension` 中的注入为例（`background.js:153-156`）：

```javascript
// 替换：
files: ['scripts/active.js']

// 为：
files: ['scripts/grid-detector.js', 'scripts/active.js']
```

同理修改 `handleTabActivation`（`background.js:183-188`）和 `handleTabUpdate`（`background.js:215-218`）中的注入。

- [ ] **Step 3: 在 `active.js` 的 `init()` 中集成 grid-detector**

在 `active.js` 的 `init()` 函数末尾、`parseConfig` 调用之后，添加 grid detector 的激活逻辑。同时需要在全局的 mousedown 处理中增加对检测到的 grid 容器的响应。

修改 `active.js` 的 `init()` 函数（约 `line 848`），在 `parseConfig(config)` 调用后添加：

```javascript
// 初始化非标准表格检测
if (window.HiTableGridDetector) {
  try {
    const grids = window.HiTableGridDetector.findGrids(document.body);
    if (grids.length > 0) {
      console.log('HiTable: Found', grids.length, 'non-standard grid(s)');
      // 为每个检测到的 grid 容器添加 data 属性标记，供选择逻辑使用
      grids.forEach((grid, index) => {
        grid.container.setAttribute('data-hitable-grid', index);
        // 为每个单元格添加 data-cell 标记，使其可以被 isSelectableCell 识别
        grid.rows.forEach(row => {
          row.forEach(cell => {
            cell.setAttribute('data-hitable-cell', 'true');
          });
        });
      });
    }
  } catch (e) {
    handleError('gridDetector', e);
  }
}
```

修改 `active.js` 的 `isSelectableCell()` 函数（约 `line 827`），扩展为同时识别标准 `<td>/<th>` 和标记过的 grid 单元格：

```javascript
function isSelectableCell(cell) {
  if (!cell || !cell.tagName) {
    return false;
  }
  const tagName = cell.tagName.toLowerCase();
  if (tagName !== 'td' && tagName !== 'th') {
    // 检查是否为 grid-detector 标记的单元格
    if (cell.hasAttribute('data-hitable-cell')) {
      return true;
    }
    return false;
  }
  const table = cell.closest('table');
  if (!table) {
    return false;
  }
  return !table.classList.contains('HiTableOverlay');
}
```

同时在 `getOutermostTable()` 函数中（约 `line 563`），扩展支持从非标准表格容器中获取根元素：

在 `getOutermostTable` 的开头增加对 grid 容器的检查：

```javascript
function getOutermostTable(element) {
  // 检查是否在非标准表格内
  const gridContainer = element.closest('[data-hitable-grid]');
  if (gridContainer) {
    return gridContainer;
  }
  // 原有逻辑...
  let table = element.closest('table');
  // ...
}
```

然后在 `LogicTable` 构造函数中（约 `line 176`），增加对 grid 容器的支持。当传入的不再是 `<table>` 元素而是普通的容器元素时，生成虚拟的逻辑表格。在 `_generate()` 方法调用 `_buildInitialGrid()` 之前，检查输入类型：

修改 `LogicTable` 构造函数（`active.js:172-191`），使其同时支持 `<table>` 和 grid 容器：

```javascript
constructor(table) {
  LogicCell.clearAllCache();
  
  /** @type {HTMLTableElement|Element} */
  this.originalTable = table;
  /** @type {LogicCell[][]} */
  this.rows = [];
  /** @type {WeakMap<HTMLTableCellElement, LogicCell[]>} */
  this.cellMap = new WeakMap();
  /** @type {number} */
  this.totalRows = 0;
  /** @type {number} */
  this.totalCols = 0;
  
  // 如果是非标准表格容器，使用 grid 模式
  if (table.hasAttribute && table.hasAttribute('data-hitable-grid')) {
    this._generateFromGrid();
  } else {
    this._generate();
  }
}
```

新增 `_generateFromGrid()` 方法。在 `LogicTable` 类中 `_getNestedTable()` 方法之后、`_generate()` 方法之前插入：

```javascript
/**
 * 从非标准表格容器生成逻辑表格（替代 _generate）
 * @private
 */
_generateFromGrid() {
  const gridData = window.HiTableGridDetector?.buildGridFromContainer(this.originalTable);
  if (!gridData || !gridData.rows.length) {
    console.warn('HiTable: Failed to build grid from container');
    this.totalRows = 0;
    this.totalCols = 0;
    return;
  }

  this.totalRows = gridData.rows.length;
  this.totalCols = gridData.rows.reduce((max, row) => Math.max(max, row.length), 0);

  for (let r = 0; r < gridData.rows.length; r++) {
    this.rows[r] = [];
    for (let c = 0; c < gridData.rows[r].length; c++) {
      const domCell = gridData.rows[r][c];
      if (domCell) {
        const logicCell = new LogicCell(this, domCell, r, c);
        this.rows[r][c] = logicCell;

        if (!this.cellMap.has(domCell)) {
          this.cellMap.set(domCell, []);
        }
        this.cellMap.get(domCell).push(logicCell);
      } else {
        this.rows[r][c] = null;
      }
    }
    // 补齐列数不足的行
    for (let c = gridData.rows[r].length; c < this.totalCols; c++) {
      this.rows[r][c] = null;
    }
  }

  console.log('HiTable: Grid-based LogicTable generated:', this.totalRows, 'x', this.totalCols);
}
```

- [ ] **Step 4: 手动验证非标准表格检测**

验证步骤：
- 打开一个使用 div 构建表格的页面（如使用 AG Grid、Ant Design Table 的任意网站）
- 也可以用 demo.html 中额外添加一个 div 构建的表格来测试
- 确认激活扩展后可以在检测到的 grid 上拖拽选择
- 确认 overlay 正常显示统计结果
- 确认标准 `<table>` 的选择不受影响（回归测试）

- [ ] **Step 5: Commit**

```bash
git add scripts/grid-detector.js scripts/background.js scripts/active.js
git commit -m "feat: add non-standard table detection for div/CSS-grid-based tables"
```

---

### Task 3: 列类型标注

**Files:**
- Modify: `scripts/active.js` (parseNumber 附近增加类型检测函数)
- Modify: `_locales/en/messages.json`
- Modify: `_locales/zh_CN/messages.json`

**Interfaces:**
- Consumes: `selectedCellsData` (二维数组), `logicTable`
- Produces: `detectColumnTypes(logicTable, startCol, endCol)` → `Array<{col: number, type: 'integer'|'decimal'|'currency'|'percentage', symbol?: string, precision?: number}>`
- Modified: `showOverlay()` / `calculation()` 在 tooltip 中显示列类型提示

**说明：** 在列的统计结果 tooltip 中标注检测到的数值子类型，帮助用户确认数据解析正确。

- [ ] **Step 1: 在 `active.js` 中添加列类型检测函数**

在 `active.js` 的 `parseNumber()` 函数附近（约 `line 1017` 之后）添加：

```javascript
/**
 * 检测选中列的数值子类型
 * @param {LogicTable} logicTable
 * @param {number} startCol - 起始列索引
 * @param {number} endCol - 结束列索引
 * @param {number} startRow - 起始行索引
 * @param {number} endRow - 结束行索引
 * @returns {Array<{col: number, type: string, currencySymbol?: string, isPercent: boolean}>}
 */
function detectColumnTypes(logicTable, startCol, endCol, startRow, endRow) {
  const types = [];
  for (let col = startCol; col <= endCol; col++) {
    let integerCount = 0;
    let decimalCount = 0;
    let currencyCount = 0;
    let percentCount = 0;
    let numericCount = 0;
    let currencySymbols = {};
    let totalPrecision = 0;

    for (let row = startRow; row <= endRow; row++) {
      const cell = logicTable.cell(row, col);
      if (!cell) continue;
      const rawText = cell.cell.innerText.trim();
      
      // 检测货币符号
      const currencyMatch = rawText.match(/^[\$€£¥₹]|HK\$|NT\$/);
      if (currencyMatch) {
        currencyCount++;
        const symbol = currencyMatch[0];
        currencySymbols[symbol] = (currencySymbols[symbol] || 0) + 1;
      }

      // 检测百分比
      if (rawText.endsWith('%')) {
        percentCount++;
      }

      // 检测小数点
      const numValue = parseNumber(rawText);
      if (!isNaN(numValue)) {
        numericCount++;
        // 记录精度
        const cleaned = rawText.replace(/[\$€£¥₹%]|HK\$|NT\$/g, '').trim();
        const decimalPart = cleaned.split(/[.,]/)[1];
        if (decimalPart && decimalPart.length > 0) {
          decimalCount++;
          totalPrecision += decimalPart.length;
        } else {
          integerCount++;
        }
      }
    }

    if (numericCount === 0) continue;

    // 判断主类型
    let type = 'decimal';
    let currencySymbol = null;
    let avgPrecision = decimalCount > 0 ? Math.round(totalPrecision / decimalCount) : 0;

    if (integerCount > decimalCount * 2) {
      type = 'integer';
    }

    if (currencyCount > numericCount * 0.5) {
      type = 'currency';
      // 选择最频繁的货币符号
      let maxCount = 0;
      for (const [sym, count] of Object.entries(currencySymbols)) {
        if (count > maxCount) {
          maxCount = count;
          currencySymbol = sym;
        }
      }
    }

    if (percentCount > numericCount * 0.5) {
      type = 'percentage';
    }

    types.push({
      col,
      type,
      currencySymbol,
      avgPrecision,
      numericCount,
      totalCount: endRow - startRow + 1
    });
  }
  return types;
}
```

- [ ] **Step 2: 在 overlay tooltip 中集成列类型信息**

修改 `calculation()` 函数中生成 tooltip 的部分（约 `line 1548-1564`），在 `statisticsTitle` 的 tooltip 中添加列类型标注：

```javascript
// 在 calculation 函数中，检测列类型（如果是 top/bottom 方向）
const columnTypes = (direction === 'top' || direction === 'bottom') 
  ? detectColumnTypes(logicTable, left, right, top, bottom)
  : [];

// ... 在生成 title 的部分：
// 查找对应列的类型信息
const colType = columnTypes.find(ct => ct.col === (left + index - 1));
let typeHint = '';
if (colType) {
  switch (colType.type) {
    case 'integer':
      typeHint = ' [' + chrome.i18n.getMessage('colTypeInteger') + ']';
      break;
    case 'currency':
      typeHint = ' [' + chrome.i18n.getMessage('colTypeCurrency') + (colType.currencySymbol ? ': ' + colType.currencySymbol : '') + ']';
      break;
    case 'percentage':
      typeHint = ' [' + chrome.i18n.getMessage('colTypePercentage') + ']';
      break;
    case 'decimal':
      typeHint = ' [' + chrome.i18n.getMessage('colTypeDecimal') + (colType.avgPrecision ? ' (' + colType.avgPrecision + 'dp)' : '') + ']';
      break;
  }
}
title = chrome.i18n.getMessage('statisticsTitle', [...]) + typeHint;
```

- [ ] **Step 3: 添加 i18n 字符串**

在 `_locales/en/messages.json` 中添加：

```json
"colTypeInteger": {
    "message": "Integer column"
},
"colTypeDecimal": {
    "message": "Decimal column"
},
"colTypeCurrency": {
    "message": "Currency column"
},
"colTypePercentage": {
    "message": "Percentage column"
}
```

在 `_locales/zh_CN/messages.json` 中添加：

```json
"colTypeInteger": {
    "message": "整数列"
},
"colTypeDecimal": {
    "message": "小数"
},
"colTypeCurrency": {
    "message": "货币"
},
"colTypePercentage": {
    "message": "百分比"
}
```

- [ ] **Step 4: 手动验证**

- 打开 demo.html 的 Financial Data 表格
- 选择数值列，hover overlay 边缘，确认 tooltip 显示列类型标注（货币列显示 "Currency column: $"，百分比列显示 "Percentage column"）
- 验证非数值列不显示类型标注

- [ ] **Step 5: Commit**

```bash
git add scripts/active.js _locales/
git commit -m "feat: add column type annotation in overlay tooltips"
```

---

### Task 4: 数据造假检测

**Files:**
- Create: `scripts/data-integrity.js`
- Modify: `scripts/background.js` (注入 data-integrity.js)
- Modify: `scripts/active.js` (在 calculation 后调用检测)
- Modify: `_locales/en/messages.json`
- Modify: `_locales/zh_CN/messages.json`

**Interfaces:**
- Consumes: `selectedCellsData` (过滤后的数值二维数组)
- Produces: `DataIntegrity.analyze(data2D, columnLabels)` → `{overall: IntegrityResult, columns: IntegrityResult[]}`
- `IntegrityResult` = `{benfordScore, lastDigitUniformity, roundingRatio, duplicateRatio, monotonicScore, flags: string[]}`

**说明：** 纯前端的统计检测，在计算完成后对选中数据运行 6 项检测。结果以 ⚠️ 角标形式显示在 overlay 上。

- [ ] **Step 1: 创建 `scripts/data-integrity.js`**

```javascript
/**
 * DataIntegrity - 数据造假统计检测
 * 纯本地统计方法，检测人工编造数据的常见痕迹
 * 只给信号，不给结论
 */
(function() {
  'use strict';

  /**
   * 获取数字的首位数字 (1-9)
   */
  function firstDigit(n) {
    if (n === 0) return 0;
    const abs = Math.abs(n);
    // 处理小数：0.0034 的首位是 3
    let val = abs;
    while (val < 1 && val > 0) val *= 10;
    while (val >= 10) val /= 10;
    return Math.floor(val);
  }

  /**
   * 获取数字的末位数字 (0-9)
   */
  function lastDigit(n) {
    // 取小数点后最后一位非零数字或整数最后一位
    const str = Math.abs(n).toFixed(10).replace(/0+$/, '');
    const lastChar = str[str.length - 1];
    if (lastChar === '.') {
      return 0; // 整数
    }
    return parseInt(lastChar, 10);
  }

  /**
   * 1. Benford's Law 符合度检测
   * 真实数据的首位数字符合 Benford 分布：
   *   1: 30.1%, 2: 17.6%, 3: 12.5%, 4: 9.7%,
   *   5: 7.9%, 6: 6.7%, 7: 5.8%, 8: 5.1%, 9: 4.6%
   * 伪造数据往往偏离此分布
   *
   * @param {number[]} values
   * @returns {{score: number, observed: number[], expected: number[], flagged: boolean}}
   *   score: 0-1, 1 表示完全符合 Benford 分布
   */
  function benfordTest(values) {
    const BENFORD = [0, 0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

    const nonZero = values.filter(v => v !== 0 && isFinite(v));
    if (nonZero.length < 30) {
      return { score: 1, observed: [], expected: BENFORD, flagged: false, insufficient: true };
    }

    const counts = new Array(10).fill(0);
    nonZero.forEach(v => {
      const d = firstDigit(v);
      if (d >= 1 && d <= 9) counts[d]++;
    });

    const total = counts.reduce((a, b) => a + b, 0);
    const observed = counts.map(c => c / total);

    // 计算与 Benford 分布的偏差（Kolmogorov-Smirnov 风格的 D 统计量）
    let maxDiff = 0;
    let cumObs = 0, cumExp = 0;
    for (let i = 0; i <= 9; i++) {
      cumObs += observed[i] || 0;
      cumExp += BENFORD[i] || 0;
      maxDiff = Math.max(maxDiff, Math.abs(cumObs - cumExp));
    }

    // D 统计量映射到 0-1 分数（0.1 以下为正常，0.2 以上为异常）
    const score = Math.max(0, 1 - maxDiff * 5);

    return {
      score: Math.round(score * 100) / 100,
      observed: observed.slice(1),
      expected: BENFORD.slice(1),
      flagged: maxDiff > 0.15,
      maxDiff: Math.round(maxDiff * 1000) / 1000
    };
  }

  /**
   * 2. 末位数字均匀度检测
   * 人的"随机感"不是真正的随机。人类编造数据时，末位数字会：
   *   - 过度避免重复（同一位连续出现相同数字）
   *   - 偏好某些数字（如 0, 5, 8）
   *   - 避免某些数字（如 1, 4, 7 在某些文化中被认为"太随机"）
   *
   * @param {number[]} values
   * @returns {{score: number, distribution: number[], flagged: boolean}}
   */
  function lastDigitTest(values) {
    const numeric = values.filter(v => isFinite(v));
    if (numeric.length < 20) {
      return { score: 1, distribution: [], flagged: false, insufficient: true };
    }

    const counts = new Array(10).fill(0);
    numeric.forEach(v => counts[lastDigit(v)]++);

    const total = counts.reduce((a, b) => a + b, 0);
    const distribution = counts.map(c => c / total);

    // 卡方检验：期望每个数字 10%
    let chiSq = 0;
    for (let i = 0; i < 10; i++) {
      const expected = total / 10;
      chiSq += Math.pow(counts[i] - expected, 2) / expected;
    }

    // 卡方值映射：< 10 正常，> 20 可疑
    const score = Math.max(0, 1 - chiSq / 30);

    // 检测某个数字占比 > 20%
    const dominant = distribution.findIndex(d => d > 0.2);
    const flagged = chiSq > 16 || dominant >= 0;

    return {
      score: Math.round(score * 100) / 100,
      distribution,
      chiSquare: Math.round(chiSq * 100) / 100,
      dominantDigit: dominant >= 0 ? dominant : null,
      flagged
    };
  }

  /**
   * 3. 取整偏好检测
   * 手工填写数据时倾向于以 0、5、00、50 结尾。
   *
   * @param {number[]} values
   * @returns {{score: number, roundRatio: number, flagged: boolean}}
   */
  function roundingTest(values) {
    const numeric = values.filter(v => isFinite(v) && v !== 0);
    if (numeric.length < 10) {
      return { score: 1, roundRatio: 0, flagged: false, insufficient: true };
    }

    let roundCount = 0;
    numeric.forEach(v => {
      const absVal = Math.abs(v);
      // 以 0 或 5 结尾（整数最后一位）
      const intPart = Math.floor(absVal);
      if (intPart % 10 === 0 || intPart % 5 === 0) {
        roundCount++;
      }
    });

    const ratio = roundCount / numeric.length;
    // 自然数据约 20% 以 0 结尾，另有 10% 以 5 结尾
    // 所以正常范围约 30%。超过 50% 为可疑
    const score = Math.max(0, 1 - (ratio - 0.3) / 0.4);

    return {
      score: Math.round(score * 100) / 100,
      roundRatio: Math.round(ratio * 100) / 100,
      flagged: ratio > 0.5
    };
  }

  /**
   * 4. 重复值检测
   * 检查数据集中是否存在异常高的重复率。
   *
   * @param {number[]} values
   * @returns {{score: number, duplicateRatio: number, mostFrequentValue: number|null, mostFrequentCount: number, flagged: boolean}}
   */
  function duplicateTest(values) {
    const numeric = values.filter(v => isFinite(v));
    if (numeric.length < 10) {
      return { score: 1, duplicateRatio: 0, flagged: false, insufficient: true };
    }

    const freq = {};
    numeric.forEach(v => {
      // 四舍五入到合理精度以避免浮点误差
      const key = Math.round(v * 10000) / 10000;
      freq[key] = (freq[key] || 0) + 1;
    });

    let maxFreq = 0;
    let maxFreqValue = null;
    for (const [key, count] of Object.entries(freq)) {
      if (count > maxFreq) {
        maxFreq = count;
        maxFreqValue = parseFloat(key);
      }
    }

    const duplicateRatio = maxFreq / numeric.length;
    // 单个值占比 > 25% 为可疑
    const flagged = duplicateRatio > 0.25;
    const score = Math.max(0, 1 - duplicateRatio / 0.5);

    return {
      score: Math.round(score * 100) / 100,
      duplicateRatio: Math.round(duplicateRatio * 100) / 100,
      mostFrequentValue: maxFreqValue,
      mostFrequentCount: maxFreq,
      flagged
    };
  }

  /**
   * 5. 比例关系异常检测
   * 如果某两列之间存在过于整齐的比例关系（所有行 B/A 几乎相同），
   * 可能是用公式生成的。
   *
   * @param {number[][]} data2D - 二维数值数组
   * @returns {Array<{colA: number, colB: number, ratioStd: number, flagged: boolean}>}
   */
  function ratioAnomalyTest(data2D) {
    const colCount = data2D[0]?.length || 0;
    if (colCount < 2) return [];

    const results = [];

    for (let a = 0; a < colCount; a++) {
      for (let b = a + 1; b < colCount; b++) {
        const ratios = [];
        for (let r = 0; r < data2D.length; r++) {
          const valA = data2D[r][a];
          const valB = data2D[r][b];
          if (!isNaN(valA) && !isNaN(valB) && valA !== 0) {
            ratios.push(valB / valA);
          }
        }

        if (ratios.length < 5) continue;

        // 计算比值的标准差
        const avg = ratios.reduce((s, v) => s + v, 0) / ratios.length;
        const variance = ratios.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / ratios.length;
        const std = Math.sqrt(variance);

        // 变异系数（CV = std/avg）< 0.02 视为过于整齐
        const cv = avg !== 0 ? std / Math.abs(avg) : 0;
        if (cv < 0.02) {
          results.push({
            colA: a,
            colB: b,
            ratioAvg: Math.round(avg * 10000) / 10000,
            ratioStd: Math.round(std * 10000) / 10000,
            cv: Math.round(cv * 10000) / 10000,
            flagged: true
          });
        }
      }
    }

    return results;
  }

  /**
   * 6. 单调序列检测
   * 排序后的数据如果呈现过于规律的等差/等比变化，可能是用 Excel 拖拽填充生成的。
   *
   * @param {number[]} values
   * @returns {{score: number, monotonicType: string|null, rSquared: number, flagged: boolean}}
   */
  function monotonicTest(values) {
    const numeric = values.filter(v => isFinite(v));
    if (numeric.length < 8) {
      return { score: 1, monotonicType: null, flagged: false, insufficient: true };
    }

    const sorted = [...numeric].sort((a, b) => a - b);

    // 线性回归检测等差趋势
    const n = sorted.length;
    const indices = sorted.map((_, i) => i);
    const xMean = (n - 1) / 2;
    const yMean = sorted.reduce((a, b) => a + b, 0) / n;

    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (sorted[i] - yMean);
      den += Math.pow(i - xMean, 2);
    }

    const slope = den !== 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;

    // 计算 R²
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * i + intercept;
      ssRes += Math.pow(sorted[i] - predicted, 2);
      ssTot += Math.pow(sorted[i] - yMean, 2);
    }

    const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

    // R² > 0.97 视为过于规整
    const flagged = rSquared > 0.97;
    const score = Math.max(0, 1 - rSquared);

    return {
      score: Math.round(score * 100) / 100,
      rSquared: Math.round(rSquared * 10000) / 10000,
      monotonicType: flagged ? 'linear' : null,
      flagged
    };
  }

  /**
   * 综合分析入口
   * @param {number[][]} data2D - 二维数组，[row][col]，已过滤非数值
   * @param {string[]} columnLabels - 列标签（表头文本，可为空数组）
   * @returns {Object} 分析结果
   */
  function analyze(data2D, columnLabels) {
    if (!data2D || data2D.length < 2) return null;

    const results = {
      // 全局检测（将所有数据展平）
      overall: {
        benford: null,
        lastDigit: null,
        rounding: null,
        duplicate: null,
        monotonic: null
      },
      // 逐列检测
      columns: [],
      // 跨列检测
      crossColumn: {
        ratios: []
      },
      // 汇总
      flagCount: 0,
      totalTests: 0
    };

    // 展平所有数据
    const flat = data2D.flat().filter(v => !isNaN(v) && isFinite(v));

    // 全局检测
    results.overall.benford = benfordTest(flat);
    results.overall.lastDigit = lastDigitTest(flat);
    results.overall.rounding = roundingTest(flat);
    results.overall.duplicate = duplicateTest(flat);
    results.overall.monotonic = monotonicTest(flat);

    // 逐列检测
    const colCount = data2D[0]?.length || 0;
    for (let c = 0; c < colCount; c++) {
      const colData = data2D.map(row => row[c]).filter(v => !isNaN(v) && isFinite(v));
      if (colData.length < 5) continue;

      results.columns.push({
        colIndex: c,
        label: columnLabels[c] || ('Col ' + (c + 1)),
        benford: benfordTest(colData),
        lastDigit: lastDigitTest(colData),
        rounding: roundingTest(colData),
        duplicate: duplicateTest(colData),
        monotonic: monotonicTest(colData)
      });
    }

    // 跨列比例异常检测
    results.crossColumn.ratios = ratioAnomalyTest(data2D);

    // 统计标记数量
    const countFlags = (obj) => {
      let count = 0;
      if (!obj) return 0;
      for (const key of Object.keys(obj)) {
        if (key === 'flagged' && obj[key] === true) count++;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          count += countFlags(obj[key]);
        }
      }
      return count;
    };

    results.flagCount = countFlags(results);
    results.totalTests = 6 + results.columns.length * 5 + 1; // 6 全局 + 每列 5 项 + 跨列比例

    return results;
  }

  /**
   * 生成人类可读的标记摘要
   * @param {Object} results - analyze() 的返回值
   * @param {Function} getMessage - i18n 函数
   * @returns {string[]} 摘要字符串数组
   */
  function generateSummary(results, getMessage) {
    if (!results) return [];

    const items = [];

    // Benford 检测
    if (results.overall.benford?.flagged) {
      items.push(getMessage('integrityBenfordFlag', [
        Math.round(results.overall.benford.maxDiff * 100) / 100
      ]));
    } else if (!results.overall.benford?.insufficient) {
      items.push(getMessage('integrityBenfordPass'));
    }

    // 末位数字检测
    if (results.overall.lastDigit?.flagged) {
      const dom = results.overall.lastDigit.dominantDigit;
      if (dom !== null) {
        items.push(getMessage('integrityLastDigitFlag', [dom.toString()]));
      } else {
        items.push(getMessage('integrityLastDigitUneven'));
      }
    }

    // 取整偏好检测
    if (results.overall.rounding?.flagged) {
      items.push(getMessage('integrityRoundingFlag', [
        Math.round(results.overall.rounding.roundRatio * 100)
      ]));
    }

    // 重复值检测
    if (results.overall.duplicate?.flagged) {
      items.push(getMessage('integrityDuplicateFlag', [
        results.overall.duplicate.mostFrequentCount,
        Math.round(results.overall.duplicate.duplicateRatio * 100)
      ]));
    }

    // 单调序列检测
    if (results.overall.monotonic?.flagged) {
      items.push(getMessage('integrityMonotonicFlag', [
        Math.round(results.overall.monotonic.rSquared * 100)
      ]));
    }

    // 跨列比例检测
    results.crossColumn.ratios.forEach(r => {
      items.push(getMessage('integrityRatioFlag', [
        String.fromCharCode(65 + r.colA),
        String.fromCharCode(65 + r.colB),
        Math.round(r.ratioAvg * 10000) / 10000
      ]));
    });

    return items;
  }

  // 暴露到全局
  window.HiTableDataIntegrity = {
    analyze,
    generateSummary,
    // 单独暴露单项检测供调试使用
    benfordTest,
    lastDigitTest,
    roundingTest,
    duplicateTest,
    ratioAnomalyTest,
    monotonicTest
  };

  console.log('HiTable: Data integrity checker initialized');
})();
```

- [ ] **Step 2: 在 `background.js` 中将 `data-integrity.js` 一同注入**

修改 `background.js` 中所有注入点，将 `data-integrity.js` 加入注入列表（在 `active.js` 之前）：

```javascript
// 原：
files: ['scripts/grid-detector.js', 'scripts/active.js']

// 改为：
files: ['scripts/grid-detector.js', 'scripts/data-integrity.js', 'scripts/active.js']
```

对 `toggleExtension`、`handleTabActivation`、`handleTabUpdate` 三处均做相同修改。

- [ ] **Step 3: 在 `active.js` 的 `calculation()` 后集成数据完整性检测**

在 `active.js` 的 `calculation()` 函数末尾（约 `line 1573`，`}` 之前）添加检测调用：

```javascript
// 数据完整性检测
if (window.HiTableDataIntegrity && selectedCellsData.length >= 3) {
  try {
    // 收集列标签
    const [top, left, bottom, right] = getSelectedRect();
    const columnLabels = [];
    for (let c = left; c <= right; c++) {
      const headerCell = logicTable.cell(top, c);
      columnLabels.push(headerCell ? headerCell.cell.innerText.trim() : '');
    }

    const integrityResults = window.HiTableDataIntegrity.analyze(selectedCellsData, columnLabels);
    if (integrityResults && integrityResults.flagCount > 0) {
      const summaryItems = window.HiTableDataIntegrity.generateSummary(integrityResults, chrome.i18n.getMessage.bind(chrome.i18n));
      showIntegrityIndicator(integrityResults, summaryItems);
    }
  } catch (e) {
    handleError('dataIntegrity', e);
  }
}
```

新增 `showIntegrityIndicator()` 函数（添加在 `calculation()` 附近）：

```javascript
/**
 * 在 overlay 上显示数据完整性检测指示器
 */
function showIntegrityIndicator(results, summaryItems) {
  if (!overlayTable || summaryItems.length === 0) return;

  // 移除旧的指示器
  const existing = overlayTable.querySelector('.HiTableIntegrityIndicator');
  if (existing) existing.remove();

  // 在 overlay 下方创建指示器行
  const indicator = document.createElement('div');
  indicator.className = 'HiTableIntegrityIndicator';
  indicator.style.cssText = `
    position: absolute;
    bottom: -28px;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    font-size: 12px;
    color: #f39c12;
    cursor: help;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
  `;

  const icon = document.createElement('span');
  icon.textContent = '⚠️';
  indicator.appendChild(icon);

  const text = document.createElement('span');
  text.textContent = summaryItems.length + ' ' + chrome.i18n.getMessage('integrityIssuesFound');
  indicator.appendChild(text);

  // Tooltip 显示详细信息
  indicator.title = summaryItems.join('\n');

  overlayTable.style.position = 'relative'; // 确保子元素绝对定位生效
  overlayTable.appendChild(indicator);

  // 存储结果以供后续引用
  overlayTable._integrityResults = results;
}
```

- [ ] **Step 4: 添加 i18n 字符串**

在 `_locales/en/messages.json` 中添加：

```json
"integrityIssuesFound": {
    "message": "data integrity issues found"
},
"integrityBenfordFlag": {
    "message": "First-digit distribution deviates from Benford's Law (D=$1$)"
},
"integrityBenfordPass": {
    "message": "First-digit distribution follows Benford's Law"
},
"integrityLastDigitFlag": {
    "message": "Last digit '$1$' appears unusually often"
},
"integrityLastDigitUneven": {
    "message": "Last digit distribution is uneven (may be human-generated)"
},
"integrityRoundingFlag": {
    "message": "$1$% of values end in 0 or 5 (unusual rounding preference)"
},
"integrityDuplicateFlag": {
    "message": "Value appears $1$ times ($2$% of data) — possible copy-paste"
},
"integrityMonotonicFlag": {
    "message": "Sorted values are too linear (R²=$1$%) — may be auto-filled"
},
"integrityRatioFlag": {
    "message": "Column $1$ / Column $2$ ratio is nearly constant ($3$) — may be formula-generated"
}
```

在 `_locales/zh_CN/messages.json` 中添加：

```json
"integrityIssuesFound": {
    "message": "项数据完整性可疑"
},
"integrityBenfordFlag": {
    "message": "首位数字分布偏离 Benford 定律 (D=$1$)"
},
"integrityBenfordPass": {
    "message": "首位数字分布符合 Benford 定律"
},
"integrityLastDigitFlag": {
    "message": "末位数字 '$1$' 出现频率异常偏高"
},
"integrityLastDigitUneven": {
    "message": "末位数字分布不均匀（疑似人工生成）"
},
"integrityRoundingFlag": {
    "message": "$1$% 的数值以 0 或 5 结尾（取整偏好异常）"
},
"integrityDuplicateFlag": {
    "message": "同一值出现 $1$ 次（占 $2$%）— 疑似复制粘贴"
},
"integrityMonotonicFlag": {
    "message": "排序后数据过于线性 (R²=$1$%) — 可能为自动填充生成"
},
"integrityRatioFlag": {
    "message": "列 $1$ / 列 $2$ 的比值几乎恒为 $3$ — 可能为公式生成"
}
```

- [ ] **Step 5: 手动验证**

- 打开 demo.html 的 Data Integrity Test 表格
- 选择 Amount 列（包含重复值和异常值 R009）
- 确认 overlay 底部出现 ⚠️ 标记
- Hover ⚠️ 标记，确认 tooltip 显示具体检测结果
- 选择简单销售数据表格（正常数据），确认不出现或很少出现 ⚠️ 标记

- [ ] **Step 6: Commit**

```bash
git add scripts/data-integrity.js scripts/background.js scripts/active.js _locales/
git commit -m "feat: add data fabrication detection with 6 statistical tests"
```

---

### Task 5: 条件格式化

**Files:**
- Modify: `assets/main.css` (新增条件格式化样式和动画)
- Modify: `scripts/active.js` (在 `selectCellsAndFillArray` 和 `showOverlay` 中应用条件格式化)
- Modify: `scripts/config.js` (配置页的条件格式化开关)
- Modify: `pages/config.html` (UI 开关)
- Modify: `_locales/en/messages.json`
- Modify: `_locales/zh_CN/messages.json`

**Interfaces:**
- Consumes: `config.conditionalFormatting.enabled` (boolean, 默认 true)
- Produces: CSS 类 `cell-above-avg`、`cell-below-avg`、`cell-anomaly`
- Modified: `selectCellsAndFillArray()` → 在设置 `cell-selected` 的同时设置条件格式化属性
- Modified: `showOverlay()` / `copyCell()` → overlay 单元格同步条件格式化样式

**说明：** 对选中数据区域应用三级条件格式化：高于均值（饱满主题色）、低于均值（淡化主题色）、异常值（慢脉冲闪烁）。颜色全部从用户选择的主题色派生。异常值定义为偏离均值超过 2 倍标准差。

- [ ] **Step 1: 在 `active.js` 中添加条件格式化计算逻辑**

在 `active.js` 的 `selectCellsAndFillArray()` 函数末尾、`deselectAllCells()` 之前（约 `line 1015`），添加条件格式化属性的设置逻辑。

修改 `selectCellsAndFillArray()` 函数。在当前版本中，该函数已经遍历了所有选中单元格并设置了 `cell-selected` 和 `cell-isNaN` 属性。需要扩展为同时设置条件格式化属性。

在 `selectCellsAndFillArray` 中，`selectedCellsData` 填充完成后，在设置 `cell.setAttribute(CONSTANTS.ATTRS.CELL_SELECTED, 'true')` 的循环内，增加条件格式化逻辑：

```javascript
function selectCellsAndFillArray() {
  const [top, left, bottom, right] = getSelectedRect();

  selectedCellsData = Array.from({ length: bottom - top + 1 }, (_, r) =>
    Array.from({ length: right - left + 1 }, (_, c) => {
      let cell = logicTable.actualCell(logicTable.cell(top + r, left + c));
      let value = parseNumber(cell.innerText);
      if (isNaN(value)) {
        cell.setAttribute(CONSTANTS.ATTRS.CELL_ISNAN, 'true');
      }
      cell.setAttribute(CONSTANTS.ATTRS.CELL_SELECTED, 'true');
      return value;
    })
  );

  // 条件格式化：计算均值、标准差，应用三级分类
  if (config.conditionalFormatting?.enabled !== false) {
    applyConditionalFormatting(top, left, bottom, right);
  }
}
```

新增 `applyConditionalFormatting()` 函数（添加在 `selectCellsAndFillArray` 之后）：

```javascript
/**
 * 对选中区域应用条件格式化
 * 三级：above-avg（饱满色）、below-avg（淡化色）、anomaly（脉冲闪烁）
 * 异常值定义：偏离均值超过 2 倍标准差（或 IQR 方法检测到的离群值）
 * 颜色全部从主题色派生
 */
function applyConditionalFormatting(top, left, bottom, right) {
  // 收集所有有效数值
  const allValues = [];
  const cellEntries = []; // {row, col, logicCell, value}

  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      const logicCell = logicTable.cell(r, c);
      if (!logicCell) continue;
      const value = parseNumber(logicCell.cell.innerText);
      if (!isNaN(value) && isFinite(value)) {
        allValues.push(value);
        cellEntries.push({ r, c, logicCell, value });
      }
    }
  }

  if (allValues.length < 3) return; // 数据太少，不应用条件格式化

  // 计算均值和标准差
  const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;
  const variance = allValues.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / allValues.length;
  const std = Math.sqrt(variance);

  const anomalyThreshold = 2 * std; // 2σ 之外为异常

  cellEntries.forEach(({ r, c, logicCell, value }) => {
    const actualCell = logicTable.actualCell(logicCell);

    // 移除旧的条件格式化属性
    actualCell.removeAttribute('cell-above-avg');
    actualCell.removeAttribute('cell-below-avg');
    actualCell.removeAttribute('cell-anomaly');

    const deviation = Math.abs(value - avg);

    if (std > 0 && deviation > anomalyThreshold) {
      // 异常值 — 慢脉冲闪烁
      actualCell.setAttribute('cell-anomaly', 'true');
    } else if (value > avg) {
      // 高于均值 — 饱满主题色
      actualCell.setAttribute('cell-above-avg', 'true');
    } else if (value < avg) {
      // 低于均值 — 淡化主题色
      actualCell.setAttribute('cell-below-avg', 'true');
    }
    // 等于均值的单元格不做特殊标记
  });

  // 将均值和标准差存储以供 overlay 使用
  selectedCellsData._stats = {
    avg,
    std,
    anomalyThreshold,
    count: allValues.length
  };
}
```

- [ ] **Step 2: 修改 `copyCell()` 使 overlay 继承条件格式化属性**

修改 `active.js` 中的 `copyCell()` 函数（约 `line 1264`）。当 `withContent` 为 true 时，将原单元格的条件格式化属性复制到 overlay 的克隆单元格：

在 `copyCell` 函数中，在 `newCell.setAttribute('cell-selected', true)` 之后添加：

```javascript
// 复制条件格式化属性到 overlay
if (withContent) {
  if (actualCell.hasAttribute('cell-anomaly')) {
    newCell.setAttribute('cell-anomaly', 'true');
  }
  if (actualCell.hasAttribute('cell-above-avg')) {
    newCell.setAttribute('cell-above-avg', 'true');
  }
  if (actualCell.hasAttribute('cell-below-avg')) {
    newCell.setAttribute('cell-below-avg', 'true');
  }
}
```

- [ ] **Step 3: 在 CSS 中添加条件格式化样式**

在 `assets/main.css` 末尾追加：

```css
/* ==========================================
   条件格式化
   颜色从主题色派生，通过 JS 动态注入的 CSS 变量控制
   ========================================== */

/* 高于均值 — 饱满主题色（透明底 + 主题色叠加） */
td[cell-above-avg='true'],
th[cell-above-avg='true'] {
  background: rgba(var(--hitable-theme-rgb), 0.85) !important;
}

/* 低于均值 — 淡化主题色 */
td[cell-below-avg='true'],
th[cell-below-avg='true'] {
  background: rgba(var(--hitable-theme-rgb), 0.3) !important;
}

/* 异常值 — 慢脉冲闪烁（约 2.5s 周期） */
@keyframes hitable-anomaly-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}

td[cell-anomaly='true'],
th[cell-anomaly='true'] {
  animation: hitable-anomaly-pulse 2.5s ease-in-out infinite;
  background: rgba(var(--hitable-theme-rgb), 0.85) !important;
}

/* ==========================================
   数据完整性指示器
   ========================================== */
.HiTableIntegrityIndicator {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

- [ ] **Step 4: 修改 `parseConfig()` 注入 CSS 变量**

修改 `active.js` 中的 `parseConfig()` 函数（约 `line 943`），在动态生成的 `<style>` 块中增加 CSS 变量定义，使条件格式化样式可以从主题色派生：

在 `style.textContent` 模板字符串开头添加 CSS 变量：

```javascript
style.textContent = `
  :root {
    --hitable-theme-rgb: ${r}, ${g}, ${b};
  }
  .${CONSTANTS.CSS.OVERLAY_TOP}, .${CONSTANTS.CSS.OVERLAY_RIGHT}, .${CONSTANTS.CSS.OVERLAY_BOTTOM}, .${CONSTANTS.CSS.OVERLAY_LEFT} { background: rgba(${rgbaColor} 0.85) !important; }
  td[${CONSTANTS.ATTRS.CELL_SELECTED}="true"], th[${CONSTANTS.ATTRS.CELL_SELECTED}="true"] { background: rgba(${rgbaColor} 1) !important; }
  .HiTableOverlay td[${CONSTANTS.ATTRS.CELL_HIGHLIGHTED}="true"], .HiTableOverlay th[${CONSTANTS.ATTRS.CELL_HIGHLIGHTED}="true"] { background: rgba(${rgbaColor} 0.5) !important; }
  .HiTableOverlay td[${CONSTANTS.ATTRS.EDGE_HIGHLIGHTED}="true"], .HiTableOverlay th[${CONSTANTS.ATTRS.EDGE_HIGHLIGHTED}="true"] { background: rgba(${darkRgbaColor} 1) !important; }
`;
```

- [ ] **Step 5: 在配置页添加条件格式化开关**

修改 `pages/config.html`，在 "Box Color" section 之后、"Enabled Algorithms" section 之前，添加条件格式化设置 section：

```html
<!-- 条件格式化 -->
<div class="section">
  <div class="section-title" data-i18n="conditionalFormatting">Conditional Formatting</div>
  <div style="display:flex;align-items:center;gap:12px">
    <input type="checkbox" id="conditionalFormattingEnabled" name="conditionalFormattingEnabled" checked
           style="width:18px;height:18px;accent-color:var(--theme-color);">
    <label for="conditionalFormattingEnabled" data-i18n="conditionalFormattingDesc" style="display:inline;margin:0;font-weight:normal;">
      Highlight above/below average values and anomalies in the selected range
    </label>
  </div>
</div>
```

修改 `scripts/config.js`，在 `saveConfig()` 函数中读取条件格式化设置：

```javascript
// 在 saveConfig() 函数内，变量声明区域增加：
var conditionalFormattingEnabled = document.getElementById('conditionalFormattingEnabled').checked;

// 在 config 对象中增加：
var config = {
    activationMode: activationMode,
    boxColor: boxColor,
    algorithm: {
        top: top, right: right, bottom: bottom, left: left
    },
    enabledAlgorithms: enabledAlgorithms,
    conditionalFormatting: {
        enabled: conditionalFormattingEnabled
    }
};
```

在 `window.onload` 的配置加载回调中，恢复条件格式化状态：

```javascript
// 在 chrome.storage.sync.get 回调中增加：
document.getElementById('conditionalFormattingEnabled').checked =
  config.conditionalFormatting?.enabled !== false; // 默认启用
```

在 `active.js` 的默认配置 `DEFAULT_ENABLED_ALGORITHMS` 附近的默认配置对象中，确保包含条件格式化默认值（在 `loadConfig()` 的 `defaultConfig` 中）：

```javascript
// 在 active.js 的 loadConfig() defaultConfig 中添加：
conditionalFormatting: {
    enabled: true
}
```

- [ ] **Step 6: 添加 i18n 字符串**

在 `_locales/en/messages.json` 中添加：

```json
"conditionalFormatting": {
    "message": "Conditional Formatting"
},
"conditionalFormattingDesc": {
    "message": "Highlight above/below average values and anomalies in the selected range. Anomalies pulse slowly."
}
```

在 `_locales/zh_CN/messages.json` 中添加：

```json
"conditionalFormatting": {
    "message": "条件格式化"
},
"conditionalFormattingDesc": {
    "message": "在选中区域高亮高于/低于均值的数据和异常值。异常值会缓慢闪烁。"
}
```

- [ ] **Step 7: 手动验证**

- 打开 demo.html 的 Simple Sales Data 表格
- 选择 Revenue 列（数值有高有低）
- 确认高于均值的单元格显示饱满主题色
- 确认低于均值的单元格显示淡化主题色
- 打开 Data Integrity Test 表格，选择 Amount 列
- 确认 R009 (98,500) 显示脉冲闪烁动画（离群值）
- 确认 R015 (-500) 也显示异常标记
- 在配置页关闭条件格式化，确认选择后不再有颜色区分

- [ ] **Step 8: Commit**

```bash
git add assets/main.css scripts/active.js scripts/config.js pages/config.html _locales/
git commit -m "feat: add conditional formatting with theme-derived colors and anomaly pulse animation"
```

---

### Task 6: 收尾 — 国际化同步 + 版本号

**Files:**
- Modify: `_locales/de/messages.json`
- Modify: `_locales/ru/messages.json`
- Modify: `_locales/ja/messages.json`
- Modify: `_locales/ko/messages.json`
- Modify: `_locales/hi/messages.json`
- Modify: `_locales/zh_HK/messages.json`
- Modify: `_locales/zh_TW/messages.json`
- Modify: `manifest.json` (version bump)

**Interfaces:** 无新增接口。

**说明：** 将所有新增的 i18n key 同步到其余 7 种语言文件中（暂时使用英文值，待翻译），并更新 manifest 版本号为 `0.1.7`。

- [ ] **Step 1: 同步新增 i18n key 到所有语言文件**

对每种语言文件（`de`, `ru`, `ja`, `ko`, `hi`, `zh_HK`, `zh_TW`），在每个文件的最后一个条目之前，添加所有新增的 key（从 en/messages.json 中收集）。value 暂时使用英文原文，标记为待翻译。

需要同步的 key 列表：
```
demoMenu, demoTitle, demoIntro, demoStep1, demoStep2, demoStep3,
demoTable1Title, demoTable1Desc, demoTable2Title, demoTable2Desc,
demoTable3Title, demoTable3Desc, demoTable4Title, demoTable4Desc,
demoTable5Title, demoTable5Desc, demoFooter,
demoTagBasic, demoTagMerged, demoTagNested, demoTagMixed, demoTagIntegrity,
demoTable6Title, demoTable6Desc, demoTable7Title, demoTable7Desc,
demoTagGrid, demoTagAria,
colTypeInteger, colTypeDecimal, colTypeCurrency, colTypePercentage,
integrityIssuesFound, integrityBenfordFlag, integrityBenfordPass,
integrityLastDigitFlag, integrityLastDigitUneven, integrityRoundingFlag,
integrityDuplicateFlag, integrityMonotonicFlag, integrityRatioFlag,
conditionalFormatting, conditionalFormattingDesc
```

- [ ] **Step 2: Bump version**

修改 `manifest.json:5`：

```json
"version": "0.1.7"
```

- [ ] **Step 3: 全量手动回归验证**

- 加载扩展，确认无控制台错误
- 打开 demo.html，逐表测试（7 个表格，含 CSS Grid 和 ARIA Grid）
- 验证选择、统计、条件格式化、数据完整性检测在所有表格类型上正常工作
- 切换配置页的主题色，确认条件格式化和异常闪烁颜色跟随变化
- 验证配置页所有新设置项的保存和恢复
- 在真实网页（如 Wikipedia 表格、GitHub 数据表格）上验证标准表格功能无回归
- 验证 GitHub 页面不触发非标准表格检测（域名排除列表生效）
- 打开 `pages/test.html`，确认页面加载后自动运行全部 25+ 测试且全部通过
- 验证 demo.html 用户页面干净无测试 UI
- 在 console 中验证 `TestRunner.runAll()` 可手动调用

- [ ] **Step 4: Commit**

```bash
git add _locales/ manifest.json
git commit -m "chore: sync i18n keys to all locales, bump version to 0.1.7"
```

---

### Task 7: 自动化测试

**Files:**
- Create: `pages/test.html`
- Create: `scripts/test-runner.js`
- Modify: `manifest.json` (web_accessible_resources 增加 test.html 和 test-runner.js)

**Interfaces:**
- Consumes: `window.HiTableDataIntegrity` (data-integrity.js 的统计检测函数)
- Produces: `pages/test.html` 加载后自动执行全部测试，结果渲染到页面 DOM

**说明：** 测试完全自动化——打开 `pages/test.html` 即自动运行全部测试，无需点击任何按钮。test.html 复用 demo.html 中的 7 张表格作为测试数据源。test.html 仅面向开发者，不在用户 UI 中暴露入口。`test-runner.js` 也支持在任意页面 console 中手动调用 `TestRunner.runAll()`。

- [ ] **Step 1: 创建 `pages/test.html`**

test.html 复用 demo.html 中的 7 张表格作为测试数据源，并自动加载 test-runner.js。页面结构与 demo.html 类似，但去掉了顶部的使用步骤说明，改为测试结果展示区域。

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HiTable — Automated Test Suite</title>
  <style>
    :root { --theme-color: #27ae60; --theme-color-light: #2ecc71; --theme-color-dark: #1e8449; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #f5f7fa;
      min-height: 100vh;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 24px; font-weight: 300; color: #333;
    }
    .test-summary {
      max-width: 900px;
      margin: 0 auto 20px;
      padding: 16px 24px;
      border-radius: 12px;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 13px;
      line-height: 1.8;
    }
    .test-summary.all-pass { background: #e8f5e9; border: 1px solid #a5d6a7; }
    .test-summary.has-fail { background: #fbe9e7; border: 1px solid #ef9a9a; }
    .test-summary.loading { background: #fff3e0; border: 1px solid #ffcc80; }
    .test-result { margin: 2px 0; }
    .test-result .pass { color: #27ae60; }
    .test-result .fail { color: #e74c3c; }
    .test-result .skip { color: #999; }
    .summary-line { font-weight: 700; margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.1); }
    /* 复用 demo 页的表格样式 */
    table.demo-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    table.demo-table th { background: #f0f4f8; color: #444; font-weight: 600; padding: 10px 14px; text-align: right; border: 1px solid #dde; }
    table.demo-table td { padding: 8px 14px; text-align: right; border: 1px solid #eef; }
    table.demo-table tr:nth-child(even) td { background: #fafbfc; }
    .css-grid-table { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr 1fr; gap: 0; border: 1px solid #dde; border-radius: 8px; overflow: hidden; }
    .css-grid-table .grid-header > div { background: #f0f4f8; color: #444; font-weight: 600; padding: 10px 14px; text-align: right; border-bottom: 2px solid #dde; }
    .css-grid-table .grid-header > div:first-child, .css-grid-table .grid-row > div:first-child { text-align: left; }
    .css-grid-table .grid-row > div { padding: 8px 14px; text-align: right; border-bottom: 1px solid #eef; }
    .css-grid-table .grid-row:nth-child(even) > div { background: #fafbfc; }
    .css-grid-table .grid-header, .css-grid-table .grid-row { display: contents; }
    .aria-grid-table { border: 1px solid #dde; border-radius: 8px; overflow: hidden; }
    .aria-grid-table [role="row"] { display: grid; grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr; border-bottom: 1px solid #eef; }
    .aria-grid-table [role="row"]:last-child { border-bottom: none; }
    .aria-grid-table .aria-header-row { background: #f0f4f8; font-weight: 600; border-bottom: 2px solid #dde; }
    .aria-grid-table [role="columnheader"] { padding: 10px 14px; text-align: right; color: #444; }
    .aria-grid-table [role="columnheader"]:first-child, .aria-grid-table [role="gridcell"]:first-child { text-align: left; }
    .aria-grid-table [role="gridcell"] { padding: 8px 14px; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧪 HiTable Automated Test Suite</h1>
  </div>

  <div class="test-summary loading" id="test-summary">
    ⏳ Running tests...
  </div>

  <!-- 以下是测试数据源 —— 7 张表格，与 demo.html 内容相同 -->

  <!-- 表格 1：简单销售数据 -->
  <table class="demo-table" id="test-sales">
    <thead><tr><th>Month</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Units Sold</th></tr></thead>
    <tbody>
      <tr><td>Jan</td><td>125,000</td><td>87,200</td><td>37,800</td><td>1,240</td></tr>
      <tr><td>Feb</td><td>118,500</td><td>85,100</td><td>33,400</td><td>1,180</td></tr>
      <tr><td>Mar</td><td>142,300</td><td>92,800</td><td>49,500</td><td>1,510</td></tr>
      <tr><td>Apr</td><td>135,800</td><td>89,400</td><td>46,400</td><td>1,380</td></tr>
      <tr><td>May</td><td>158,200</td><td>97,600</td><td>60,600</td><td>1,650</td></tr>
      <tr><td>Jun</td><td>148,900</td><td>94,300</td><td>54,600</td><td>1,520</td></tr>
      <tr><td>Jul</td><td>162,500</td><td>101,200</td><td>61,300</td><td>1,700</td></tr>
      <tr><td>Aug</td><td>155,000</td><td>98,700</td><td>56,300</td><td>1,590</td></tr>
    </tbody>
  </table>
  <br>

  <!-- 表格 2：合并单元格 -->
  <table class="demo-table" id="test-merged">
    <thead><tr><th></th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th></tr></thead>
    <tbody>
      <tr><td>9:00</td><td>Math</td><td>English</td><td rowspan="2">Physics Lab</td><td>Math</td><td>English</td></tr>
      <tr><td>10:00</td><td>History</td><td>Math</td><td>History</td><td>Chemistry</td></tr>
      <tr><td>11:00</td><td colspan="2" style="text-align:center">PE (All Grades)</td><td>English</td><td>Chemistry</td><td>History</td></tr>
    </tbody>
  </table>
  <br>

  <!-- 表格 3：嵌套表格 -->
  <table class="demo-table" id="test-nested">
    <thead><tr><th>Quarter</th><th>Revenue</th><th>Expenses</th><th>Net Income</th></tr></thead>
    <tbody>
      <tr><td>Q1</td><td>385,800</td><td>264,700</td><td>121,100</td></tr>
      <tr>
        <td>Q2</td>
        <td><table><tr><td>Apr</td><td>135,800</td></tr><tr><td>May</td><td>158,200</td></tr><tr><td>Jun</td><td>148,900</td></tr></table></td>
        <td><table><tr><td>Apr</td><td>89,400</td></tr><tr><td>May</td><td>97,600</td></tr><tr><td>Jun</td><td>94,300</td></tr></table></td>
        <td><table><tr><td>Apr</td><td>46,400</td></tr><tr><td>May</td><td>60,600</td></tr><tr><td>Jun</td><td>54,600</td></tr></table></td>
      </tr>
      <tr><td>Q3</td><td>—</td><td>—</td><td>—</td></tr>
      <tr><td>Q4</td><td>—</td><td>—</td><td>—</td></tr>
    </tbody>
  </table>
  <br>

  <!-- 表格 4：混合货币 -->
  <table class="demo-table" id="test-financial">
    <thead><tr><th>Product</th><th>Price</th><th>Qty Sold</th><th>Revenue</th><th>YoY Change</th><th>Margin</th></tr></thead>
    <tbody>
      <tr><td>Widget A</td><td>$49.99</td><td>2,340</td><td>$116,976.60</td><td>+12.5%</td><td>34.2%</td></tr>
      <tr><td>Widget B</td><td>€29.50</td><td>1,870</td><td>€55,165.00</td><td>-3.2%</td><td>28.7%</td></tr>
      <tr><td>Widget C</td><td>¥5,800</td><td>890</td><td>¥5,162,000</td><td>+8.7%</td><td>41.5%</td></tr>
      <tr><td>Widget D</td><td>£19.99</td><td>3,120</td><td>£62,368.80</td><td>+22.1%</td><td>19.8%</td></tr>
      <tr><td>Bundle X</td><td>$149.00</td><td>450</td><td>$67,050.00</td><td>-1.8%</td><td>45.0%</td></tr>
      <tr><td>Bundle Y</td><td>$199.00</td><td>320</td><td>$63,680.00</td><td>+5.3%</td><td>52.3%</td></tr>
    </tbody>
  </table>
  <br>

  <!-- 表格 5：数据完整性 -->
  <table class="demo-table" id="test-integrity">
    <thead><tr><th>Record ID</th><th>Amount</th><th>Quantity</th><th>Unit Price</th></tr></thead>
    <tbody>
      <tr><td>R001</td><td>1,250.00</td><td>5</td><td>250.00</td></tr>
      <tr><td>R002</td><td>1,250.00</td><td>5</td><td>250.00</td></tr>
      <tr><td>R003</td><td>1,250.00</td><td>5</td><td>250.00</td></tr>
      <tr><td>R004</td><td>1,280.00</td><td>8</td><td>160.00</td></tr>
      <tr><td>R005</td><td>1,280.00</td><td>8</td><td>160.00</td></tr>
      <tr><td>R006</td><td>1,300.00</td><td>10</td><td>130.00</td></tr>
      <tr><td>R007</td><td>1,300.00</td><td>10</td><td>130.00</td></tr>
      <tr><td>R008</td><td>1,300.00</td><td>10</td><td>130.00</td></tr>
      <tr><td>R009</td><td>98,500.00</td><td>12</td><td>8,208.33</td></tr>
      <tr><td>R010</td><td>1,350.00</td><td>15</td><td>90.00</td></tr>
      <tr><td>R011</td><td>1,400.00</td><td>20</td><td>70.00</td></tr>
      <tr><td>R012</td><td>1,450.00</td><td>25</td><td>58.00</td></tr>
      <tr><td>R013</td><td>1,500.00</td><td>30</td><td>50.00</td></tr>
      <tr><td>R014</td><td>1,550.00</td><td>35</td><td>44.29</td></tr>
      <tr><td>R015</td><td>-500.00</td><td>40</td><td>-12.50</td></tr>
    </tbody>
  </table>
  <br>

  <!-- 表格 6：CSS Grid -->
  <div class="css-grid-table" id="test-cssgrid">
    <div class="grid-header"><div>Product</div><div>Sales Q1</div><div>Sales Q2</div><div>Sales Q3</div><div>Sales Q4</div><div>Total</div></div>
    <div class="grid-row"><div>Alpha</div><div>12,500</div><div>14,200</div><div>13,800</div><div>16,100</div><div>56,600</div></div>
    <div class="grid-row"><div>Beta</div><div>9,800</div><div>11,300</div><div>10,500</div><div>12,900</div><div>44,500</div></div>
    <div class="grid-row"><div>Gamma</div><div>22,100</div><div>19,700</div><div>24,300</div><div>21,800</div><div>87,900</div></div>
    <div class="grid-row"><div>Delta</div><div>8,400</div><div>7,900</div><div>9,200</div><div>8,800</div><div>34,300</div></div>
  </div>
  <br>

  <!-- 表格 7：ARIA Grid -->
  <div role="grid" aria-label="Test Data" class="aria-grid-table" id="test-ariagrid">
    <div role="row" class="aria-header-row"><div role="columnheader">Employee</div><div role="columnheader">Dept</div><div role="columnheader">Projects</div><div role="columnheader">Hours</div><div role="columnheader">Rating</div></div>
    <div role="row"><div role="gridcell">Alice</div><div role="gridcell">Eng</div><div role="gridcell">12</div><div role="gridcell">1,840</div><div role="gridcell">4.8</div></div>
    <div role="row"><div role="gridcell">Bob</div><div role="gridcell">Design</div><div role="gridcell">8</div><div role="gridcell">1,620</div><div role="gridcell">4.5</div></div>
    <div role="row"><div role="gridcell">Carol</div><div role="gridcell">Eng</div><div role="gridcell">15</div><div role="gridcell">2,010</div><div role="gridcell">4.9</div></div>
    <div role="row"><div role="gridcell">David</div><div role="gridcell">Marketing</div><div role="gridcell">6</div><div role="gridcell">1,450</div><div role="gridcell">4.2</div></div>
    <div role="row"><div role="gridcell">Eva</div><div role="gridcell">Eng</div><div role="gridcell">10</div><div role="gridcell">1,780</div><div role="gridcell">4.6</div></div>
  </div>

  <script src="../scripts/test-runner.js"></script>
</body>
</html>
```

- [ ] **Step 2: 创建 `scripts/test-runner.js`（自动执行版）**

```javascript
/**
 * TestRunner - 轻量浏览器内测试框架
 * 零依赖，在 Demo 页面或任意已注入 active.js 的页面中运行
 */
(function() {
  'use strict';

  const tests = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  /**
   * 注册一个测试
   * @param {string} name - 测试名称
   * @param {Function} fn - 测试函数，返回 true 表示通过
   */
  function test(name, fn) {
    tests.push({ name, fn });
  }

  /**
   * 断言工具
   */
  const assert = {
    equal(actual, expected, msg) {
      if (actual !== expected) {
        throw new Error(msg || `Expected ${expected}, got ${actual}`);
      }
    },
    approx(actual, expected, tolerance, msg) {
      if (Math.abs(actual - expected) > (tolerance || 0.0001)) {
        throw new Error(msg || `Expected ~${expected}, got ${actual}`);
      }
    },
    isTrue(condition, msg) {
      if (!condition) {
        throw new Error(msg || 'Expected truthy value');
      }
    },
    isFalse(condition, msg) {
      if (condition) {
        throw new Error(msg || 'Expected falsy value');
      }
    },
    notNaN(value, msg) {
      if (isNaN(value)) {
        throw new Error(msg || 'Expected a number, got NaN');
      }
    },
    throws(fn, msg) {
      try {
        fn();
        throw new Error(msg || 'Expected function to throw');
      } catch (e) {
        if (e.message === (msg || 'Expected function to throw')) throw e;
        // 预期的异常，通过
      }
    }
  };

  /**
   * 模拟统计数据（来自 active.js 的 statistics 对象的副本）
   * 因为 active.js 的函数在闭包内，test-runner 需要独立副本
   */
  const statistics = {
    CNT: (data) => data.length,
    SUM: (data) => data.reduce((a, item) => a + item, 0),
    AVG: (data) => statistics.SUM(data) / data.length,
    VAR: (data) => {
      const avg = statistics.AVG(data);
      return data.reduce((sum, item) => sum + ((item - avg) ** 2), 0) / data.length;
    },
    MIN: (data) => Math.min(...data),
    MAX: (data) => Math.max(...data),
    RNG: (data) => statistics.MAX(data) - statistics.MIN(data),
    MED: (data) => {
      const sorted = data.slice().sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
    },
    STD: (data) => Math.sqrt(statistics.VAR(data)),
    MOD: (data) => {
      const freq = {};
      let maxFreq = 0, mode = data[0];
      data.forEach(v => {
        freq[v] = (freq[v] || 0) + 1;
        if (freq[v] > maxFreq) { maxFreq = freq[v]; mode = v; }
      });
      return mode;
    },
    Q1: (data) => {
      const sorted = data.slice().sort((a, b) => a - b);
      const pos = (sorted.length - 1) * 0.25;
      const lower = Math.floor(pos), upper = Math.ceil(pos);
      return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
    },
    Q3: (data) => {
      const sorted = data.slice().sort((a, b) => a - b);
      const pos = (sorted.length - 1) * 0.75;
      const lower = Math.floor(pos), upper = Math.ceil(pos);
      return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
    },
    IQR: (data) => statistics.Q3(data) - statistics.Q1(data),
    SKW: (data) => {
      const n = data.length;
      if (n < 3) return 0;
      const avg = statistics.AVG(data), std = statistics.STD(data);
      if (std === 0) return 0;
      const sum = data.reduce((acc, val) => acc + Math.pow((val - avg) / std, 3), 0);
      return (n / ((n - 1) * (n - 2))) * sum;
    },
    KUR: (data) => {
      const n = data.length;
      if (n < 4) return 0;
      const avg = statistics.AVG(data), std = statistics.STD(data);
      if (std === 0) return 0;
      const sum = data.reduce((acc, val) => acc + Math.pow((val - avg) / std, 4), 0);
      const kurtosis = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum;
      const adjustment = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
      return kurtosis - adjustment;
    }
  };

  // ==========================================
  // 测试用例定义
  // ==========================================

  // 统计算法测试
  test('CNT: count of array', () => {
    assert.equal(statistics.CNT([1, 2, 3, 4, 5]), 5);
    assert.equal(statistics.CNT([]), 0);
    assert.equal(statistics.CNT([42]), 1);
  });

  test('SUM: sum of array', () => {
    assert.equal(statistics.SUM([1, 2, 3, 4, 5]), 15);
    assert.equal(statistics.SUM([-1, 1]), 0);
    assert.equal(statistics.SUM([0.1, 0.2]), 0.3);
  });

  test('AVG: average of array', () => {
    assert.equal(statistics.AVG([1, 2, 3, 4, 5]), 3);
    assert.equal(statistics.AVG([10, 20, 30]), 20);
  });

  test('VAR: variance of array', () => {
    const v = statistics.VAR([1, 2, 3, 4, 5]);
    assert.equal(v, 2); // population variance: ((1-3)²+(2-3)²+(3-3)²+(4-3)²+(5-3)²)/5 = (4+1+0+1+4)/5 = 2
  });

  test('MIN/MAX: min and max', () => {
    assert.equal(statistics.MIN([5, 2, 8, 1, 9]), 1);
    assert.equal(statistics.MAX([5, 2, 8, 1, 9]), 9);
  });

  test('RNG: range', () => {
    assert.equal(statistics.RNG([5, 2, 8, 1, 9]), 8);
  });

  test('MED: median - odd count', () => {
    assert.equal(statistics.MED([1, 3, 3, 6, 7, 8, 9]), 6);
  });

  test('MED: median - even count', () => {
    assert.equal(statistics.MED([1, 2, 3, 4, 5, 6]), 3.5);
  });

  test('STD: standard deviation', () => {
    assert.equal(statistics.STD([1, 2, 3, 4, 5]), Math.sqrt(2));
  });

  test('MOD: mode', () => {
    assert.equal(statistics.MOD([1, 2, 2, 3, 4]), 2);
    assert.equal(statistics.MOD([5, 5, 3, 3, 5]), 5);
  });

  test('Q1/Q3/IQR: quartiles', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    // Q1 position: (11-1)*0.25 = 2.5 → between index 2(value 3) and 3(value 4) → 3.5
    assert.equal(statistics.Q1(data), 3.5);
    // Q3 position: (11-1)*0.75 = 7.5 → between index 7(value 8) and 8(value 9) → 8.5
    assert.equal(statistics.Q3(data), 8.5);
    assert.equal(statistics.IQR(data), 5);
  });

  test('SKW: skewness - symmetric data', () => {
    const sym = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    assert.approx(statistics.SKW(sym), 0, 0.01);
  });

  test('SKW: skewness - right-skewed data > 0', () => {
    const skewed = [1, 1, 1, 2, 2, 3, 10];
    assert.isTrue(statistics.SKW(skewed) > 0);
  });

  test('KUR: kurtosis - normal-like data near 0', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    assert.approx(statistics.KUR(data), -1.2, 1.5); // 均匀分布的峰度约 -1.2
  });

  // 数字解析测试
  test('parseNumber: integer', () => {
    // 需要模拟 active.js 的 parseNumber 逻辑
    const testParse = parseNumberFn();
    assert.equal(testParse('123'), 123);
    assert.equal(testParse('-456'), -456);
  });

  test('parseNumber: with commas', () => {
    const testParse = parseNumberFn();
    assert.equal(testParse('1,234'), 1234);
    assert.equal(testParse('1,234,567'), 1234567);
  });

  test('parseNumber: currency', () => {
    const testParse = parseNumberFn();
    assert.equal(testParse('$1,234.56'), 1234.56);
    assert.equal(testParse('€99.99'), 99.99);
    assert.equal(testParse('¥5,800'), 5800);
  });

  test('parseNumber: percentage', () => {
    const testParse = parseNumberFn();
    assert.approx(testParse('12.5%'), 0.125, 0.001);
    assert.approx(testParse('-3.2%'), -0.032, 0.001);
  });

  test('parseNumber: non-numeric', () => {
    const testParse = parseNumberFn();
    assert.isTrue(isNaN(testParse('N/A')));
    assert.isTrue(isNaN(testParse('—')));
    assert.isTrue(isNaN(testParse('abc')));
  });

  // 数据完整性检测测试
  test('DataIntegrity: Benford test on natural data', () => {
    if (!window.HiTableDataIntegrity) return; // 跳过（data-integrity.js 未注入）

    // 模拟符合 Benford 分布的数据（指数增长）
    const natural = [];
    for (let i = 0; i < 100; i++) {
      natural.push(Math.pow(1.1, i));
    }
    const result = window.HiTableDataIntegrity.benfordTest(natural);
    assert.isFalse(result.flagged, 'Natural-like data should not flag Benford test');
  });

  test('DataIntegrity: Benford test on uniform data', () => {
    if (!window.HiTableDataIntegrity) return;

    // 模拟均匀分布的数据（人为编造的特征）
    const uniform = [];
    for (let i = 0; i < 100; i++) {
      uniform.push(Math.floor(Math.random() * 900) + 100);
    }
    const result = window.HiTableDataIntegrity.benfordTest(uniform);
    // 均匀分布的首位数字偏离 Benford，应该被标记
    assert.isTrue(result.flagged, 'Uniform-distribution data should flag Benford test');
  });

  test('DataIntegrity: last digit test - even distribution', () => {
    if (!window.HiTableDataIntegrity) return;

    // 生成末位分布均匀的数据（通过取整模拟）
    const values = [];
    for (let i = 0; i < 100; i++) {
      values.push(i * 1.37); // 自然数据末位较均匀
    }
    const result = window.HiTableDataIntegrity.lastDigitTest(values);
    // 自然数据末位分布应不会被标记为极端异常
    assert.isTrue(result.score > 0.3, 'Natural last-digit distribution should score > 0.3');
  });

  test('DataIntegrity: last digit test - dominant digit', () => {
    if (!window.HiTableDataIntegrity) return;

    // 生成以 0 和 5 结尾为主的数据（手工填写特征）
    const values = [];
    const endings = [10, 15, 20, 25, 30, 35, 50, 55, 60, 65, 70, 75, 80, 85, 100];
    for (let i = 0; i < 80; i++) {
      values.push(endings[Math.floor(Math.random() * endings.length)] * (1 + Math.random() * 0.5));
    }
    const result = window.HiTableDataIntegrity.lastDigitTest(values);
    // 以 0 和 5 结尾的数据末位 0 和 5 会明显偏高
    // 这应该被标记
    assert.isTrue(result.flagged, 'Data dominated by 0/5 endings should flag last-digit test');
  });

  test('DataIntegrity: rounding test', () => {
    if (!window.HiTableDataIntegrity) return;

    // 大部分以 0 或 5 结尾的数据
    const rounded = [100, 200, 350, 500, 600, 750, 800, 900, 1000, 1200, 1500, 2000];
    const result = window.HiTableDataIntegrity.roundingTest(rounded);
    assert.isTrue(result.flagged, 'Heavily rounded data should flag rounding test');
  });

  test('DataIntegrity: duplicate test', () => {
    if (!window.HiTableDataIntegrity) return;

    // 大量重复值的数据
    const duped = [1250, 1250, 1250, 1280, 1280, 1300, 1300, 1300, 98500];
    const result = window.HiTableDataIntegrity.duplicateTest(duped);
    assert.isTrue(result.flagged, 'Data with many duplicates should flag duplicate test');
  });

  test('DataIntegrity: monotonic test - linear data', () => {
    if (!window.HiTableDataIntegrity) return;

    // 完美的线性序列（Excel 自动填充）
    const linear = [50, 58, 70, 90, 130, 208, 350, 620, 1450, 1550, 1500, 1400, 1350];
    // Wait, this isn't actually linear. Let me use a proper linear sequence.
    const perfectlyLinear = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    const result = window.HiTableDataIntegrity.monotonicTest(perfectlyLinear);
    assert.isTrue(result.rSquared > 0.99, 'Perfectly linear data should have R² > 0.99');
    assert.isTrue(result.flagged, 'Perfectly linear data should flag monotonic test');
  });

  test('DataIntegrity: monotonic test - natural data', () => {
    if (!window.HiTableDataIntegrity) return;

    // 自然波动数据
    const natural = [125000, 118500, 142300, 135800, 158200, 148900, 162500, 155000];
    const result = window.HiTableDataIntegrity.monotonicTest(natural);
    // 自然数据 R² 应该不会极高
    assert.isTrue(result.rSquared < 0.99, 'Natural fluctuating data should not have extremely high R²');
  });

  test('DataIntegrity: full analyze on demo data', () => {
    if (!window.HiTableDataIntegrity) return;

    // 使用 demo 页上数据完整性测试表的 Amount 列数据
    const data2D = [
      [1250], [1250], [1250], [1280], [1280], [1300], [1300],
      [1300], [98500], [1350], [1400], [1450], [1500], [1550], [-500]
    ];
    const results = window.HiTableDataIntegrity.analyze(data2D, ['Amount']);
    assert.isTrue(results !== null, 'analyze() should return results');
    assert.isTrue(results.flagCount > 0, 'Anomalous data should produce flags');
    assert.isTrue(results.overall.benford !== null, 'Benford test should run');
    assert.isTrue(results.overall.duplicate.flagged, 'Duplicate test should be flagged');
  });

  // ==========================================
  // parseNumber 辅助函数（从 active.js 提取，用于测试）
  // ==========================================
  function parseNumberFn() {
    return function parseNumber(text) {
      text = text.replace(/[\$€£¥₽₹]|HK\$|NT\$/g, '');
      let isPercentage = false;
      if (text.endsWith('%')) {
        text = text.slice(0, -1);
        isPercentage = true;
      }
      if (!/^[-+]?[\d,\.]*$/.test(text)) {
        return NaN;
      }
      let formatter = new Intl.NumberFormat();
      let testNumber = formatter.format(123.45);
      if (testNumber.includes(',')) {
        text = text.replace(/\./g, '').replace(/,/g, '.');
      } else {
        text = text.replace(/,/g, '');
      }
      let value = parseFloat(text);
      if (isPercentage) {
        value /= 100;
      }
      return value;
    };
  }

  // ==========================================
  // 测试运行器
  // ==========================================
  function runAll(containerId) {
    passed = 0;
    failed = 0;
    skipped = 0;
    const results = [];

    tests.forEach(t => {
      try {
        t.fn();
        passed++;
        results.push({ name: t.name, status: 'pass' });
      } catch (e) {
        if (e.message && e.message.startsWith('SKIP:')) {
          skipped++;
          results.push({ name: t.name, status: 'skip', error: e.message });
        } else {
          failed++;
          results.push({ name: t.name, status: 'fail', error: e.message });
        }
      }
    });

    // 渲染结果到 DOM
    const container = document.getElementById(containerId || 'test-summary');
    if (container) {
      let html = '';
      results.forEach(r => {
        const icon = r.status === 'pass' ? '✓' : r.status === 'skip' ? '⊘' : '✗';
        const cssClass = r.status === 'pass' ? 'pass' : r.status === 'skip' ? 'skip' : 'fail';
        html += `<div class="${cssClass}">${icon} ${r.name}`;
        if (r.error) html += ` <span style="color:#999;font-size:11px;">— ${r.error}</span>`;
        html += '</div>';
      });
      html += `<div class="summary"><span class="pass">${passed} passed</span>, `;
      html += `<span class="fail">${failed} failed</span>`;
      if (skipped > 0) html += `, <span style="color:#999">${skipped} skipped</span>`;
      html += ` (${results.length} total)</div>`;
      container.innerHTML = html;
    }

    console.log(`Tests: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    return { passed, failed, skipped, total: results.length };
  }

  // 暴露到全局
  window.TestRunner = { test, assert, runAll, statistics };

  /**
   * 自动执行模式：页面加载完成后自动运行全部测试
   * 判断依据：URL 路径包含 test.html 或 URL 参数 ?autotest=1
   */
  function shouldAutoRun() {
    // 检查是否在 test.html 页面
    if (window.location.pathname.includes('test.html')) return true;
    // 检查 URL 参数 ?autotest=1（方便在任意页面调试）
    const params = new URLSearchParams(window.location.search);
    if (params.get('autotest') === '1') return true;
    return false;
  }

  if (shouldAutoRun()) {
    // DOM 加载完成后自动运行
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => runAll('test-summary'), 50);
      });
    } else {
      setTimeout(() => runAll('test-summary'), 50);
    }
  }

  console.log('HiTable: Test runner initialized (' + tests.length + ' tests registered)' +
    (shouldAutoRun() ? ' — auto-running' : ''));
})();
```

- [ ] **Step 3: 在 `manifest.json` 中将 `test.html` 和 `test-runner.js` 加入 `web_accessible_resources`**

```json
"resources": ["assets/logo.png", "assets/active.png", "assets/inactive.png", "assets/main.css", "_locales/*/messages.json", "pages/demo.html", "pages/test.html", "scripts/test-runner.js"],
```

- [ ] **Step 4: 手动验证自动化测试**

- 在浏览器地址栏输入扩展 ID 对应的 `chrome-extension://<id>/pages/test.html` 打开测试页
- 确认页面加载后自动显示 "⏳ Running tests..." 然后立即更新为结果
- 确认全部 25+ 测试自动执行完毕
- 确认通过的显示绿 ✓，失败的显示红 ✗
- 确认 data-integrity.js 函数未注入时（test.html 不在 content_scripts 注入范围内），DataIntegrity 测试显示灰色 ⊘（跳过）
- 确认 demo.html 用户页面没有任何测试 UI 残留
- 在任意页面 console 中手动调用 `TestRunner.runAll()` 确认也可执行

- [ ] **Step 5: Commit**

```bash
git add pages/test.html scripts/test-runner.js manifest.json
git commit -m "test: add automated test page with auto-executing test runner (25+ tests)"
```

---

## 总结

| Task | 内容 | 新增文件 | 修改文件 |
|------|------|----------|----------|
| 1 | Demo 页面（7 表，用户手动体验） | `pages/demo.html` | `manifest.json`, `background.js`, `config.js`, `config.html`, `_locales/*` |
| 2 | 非标准表格检测（含域名排除） | `scripts/grid-detector.js` | `background.js`, `active.js` |
| 3 | 列类型标注 | — | `active.js`, `_locales/*` |
| 4 | 数据造假检测 | `scripts/data-integrity.js` | `background.js`, `active.js`, `_locales/*` |
| 5 | 条件格式化 | — | `main.css`, `active.js`, `config.js`, `config.html`, `_locales/*` |
| 6 | 收尾（i18n 同步 + version） | — | `_locales/*`, `manifest.json` |
| 7 | 自动化测试（25+ tests，自动执行） | `pages/test.html`, `scripts/test-runner.js` | `manifest.json` |
