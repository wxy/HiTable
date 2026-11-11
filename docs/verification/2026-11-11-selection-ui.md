# 选区与统计浮层 UI 验证

日期：2026-11-11。基线：`b1c4f0845dec586c0e6cb664a5c382a1444d0add`（PR #62）。本轮实现已讨论的 UI 方案，保留四边统计、工具栏启停与数据快照。不更新 0.2.1 版本、tag、Release、发布 ZIP 或商店。

## 实现范围

| Before | After | Why |
| --- | --- | --- |
| 所有页面使用同一固定背景，文字始终白色 | 自动主题参考表格所在区域的 CSS 背景；固定主题保留选定颜色，文字随配色调整 | 保留鲜明浮层身份，同时使文字可读 |
| 角点显示算法缩写，点击轮换 | 外围四角按钮显示本地化全称，菜单直接选择，支持键盘导航 | 明确可选算法及作用方向 |
| 选错后需清除重选 | 内层数据边界提供四个独立手柄，拖动预览、松手提交；也可用方向键 | 直接调整范围，避免与算法按钮争用位置 |
| 复制没有结果反馈 | 剪贴板写入成功后提示选区行列数及是否含统计，失败显示错误提示 | 明确操作是否完成 |
| 非数值被加删除线，空统计可能显示 NaN | 非数值灰显、保留复制原文；无可计算数值显示破折号，计数仍可显示 0 | 区分未参与数值统计和实际合计为零 |

- 新用户默认自动主题；已有配置未包含 themeMode 时继续固定使用原颜色。设置提供 auto／fixed，点击色块即切换固定主题。仅加载旧配置不会重写其存储内容。
- 白底自动使用 `#16804a`，深色背景使用 `#44d7b6`，浅粉背景使用 `#a3214c`；其他浅色背景按相近色相选深色。中间明度背景进一步拉开明暗。背景采样合成透明祖先的 CSS 背景色，优先反映表格区域。
- 自动主题以背景对比度 3:1 为选色目标；正文、灰显文字和统计文字选择足够对比的前景色。固定模式保持用户颜色，仅调整文字等附属样式。
- 手柄调节只改变范围，继续使用本次整表快照；即使源表重建，也能扩展到已缓存的其他单元格。Esc、pointercancel 或失焦取消正在进行的调整并恢复原选区；普通 Esc 仍清除选区。拖选进行中不复制尚未提交的范围。
- 算法按钮与手柄位于外层统计带和内层数据边界。固定数据列宽防止长结果或本地化名称撑开选区。小浮层及其菜单在视口边缘避让，手柄命中坐标同步补偿位移。
- 复制提示区分选区和选区加统计两种结果；等待 writeText 完成，处理真实拒绝与 API 不可用。清除／停用后，旧异步结果不会重建提示。提示避开现有数据完整性指示器。
- 十种语言各新增 20 个消息键、更新 5 个旧说明；设置、帮助和 README 同步。未添加权限、依赖、网络服务或第二套激活模式。

## 环境与版本绑定

本机 macOS，Google Chrome **157.0.8103.39**、Playwright **1.65.0**。每轮使用新的临时 Chrome profile，通过 Extensions.loadUnpacked 加载真实源码扩展，由 Extensions.triggerAction 触发真实工具栏入口。鼠标拖选、键盘和系统剪贴板读写均走浏览器实际路径；未模拟 chrome API。

主 viewport 为 1500×1100；边缘场景为 390×800。blur／pointercancel 场景注入相应事件通知来验证状态恢复，未宣称验证真实 OS 切窗或触摸取消。所有输入为 localhost 测试数据，没有访问用户已有浏览器 profile。

最终运行代码 SHA-256：

```text
scripts/active.js  a42451354243f711fd047f98c6ff64b668c8e91c091242cb7dc353f503c1b007
scripts/config.js b8d5650be3139c54511595461658da55f70a1566d73b50e4cfc9653d60326793
assets/main.css   ccfc9645f2972daeff506be9d13d299942f6d67a5a25df2952fbda4cfa4ff47c
```

## 最终验收：32 个场景全部通过

| 范围 | 场景数 | 实际结果 |
| --- | ---: | --- |
| 自动配色 | 4 | 白底为绿色、深底为亮青绿、浅粉为深莓红；深色页面中的白底表格仍按白底处理。行 SUM 均为 `5280,3800,6360,3280`，原表业务事件计数为 0，四个算法按钮与四个手柄均出现。 |
| 本地化参数 | 1 | Chrome i18n 将复制消息中的行列占位符正确替换为 4、5，无残留美元符号。 |
| 算法菜单 | 1 | 显示本地化名称及 10 个已启用选项；将右侧 SUM 改为 AVG 后为 `1320,950,1590,820`。Enter 打开、方向键移动、Esc 关闭菜单且保留选区，aria-expanded 随之更新。 |
| 复制与灰显 | 1 | 单次复制完整 4×5 数据，包括 4 个非数值原文；灰显格无删除线。对应空统计显示 `—`。快速第二次复制包含统计，并显示不同的复制摘要。 |
| 东南手柄与快照 | 1 | 拖到第三行第四列后为 3×4；期间源值 1200 改 999，浮层／统计／复制仍使用 1200，未触发源表事件。 |
| 调整中 Esc | 1 | 取消预览后恢复原来的 4×5 数据，手柄退出调整状态。 |
| 键盘手柄 | 1 | 聚焦东南手柄按左键，4×5 改为 4×4，焦点仍保留在手柄。 |
| 数据格几何 | 1 | 源首格 `x=200.5,y=200.5,w=110,h=60`；浮层 `x=201,y=201,w=110,h=60`，尺寸一致，位置差不超过 1px。 |
| 其他三个手柄 | 3 | 西北、东北、西南分别调整得到预期的 3×4 子范围，源表事件计数均为 0。 |
| 扩展冻结范围 | 1 | 先选 2×2，调整时整个源 table 被替换为 999；仍可扩展到原快照的 3×4 内容，复制与之相同。 |
| 旧配置与手动切换 | 1 | 缺少 themeMode 的旧蓝色配置保持固定且未被重写；在设置切自动后呈现深莓红；点击红色色块恢复 fixed 并应用红色，其他数字格式等配置保留。 |
| 新用户默认 | 1 | 删除 HiTable 设置后激活，白底使用自动绿色；设置页默认显示 auto。 |
| 真实权限拒绝 | 1 | CDP 同时拒绝两种 clipboard-write 权限描述，navigator.permissions 返回 denied；扩展显示复制失败提示，无未捕获错误。 |
| 非安全 HTTP | 1 | insecure.hitable.test 仅通过 Chrome host-resolver 映射到本机服务器，isSecureContext=false；剪贴板 API 不可用时显示失败提示，无未捕获错误。 |
| 停用／再激活 | 1 | 停用移除浮层、菜单、手柄和 Toast，原表点击事件恢复；再次激活只有一套浮层与四个手柄，不重复触发原表事件。 |
| 菜单关闭 | 1 | 点数据区或滚动关闭菜单；保留选区，无错误。 |
| 视口边缘 | 1 | 390×800 中的单格浮层和菜单均在视口内；避让后拖动手柄仍按正确的单元格坐标扩大到两行。 |
| 罗马尼亚数字 | 1 | `1.234,56 RON + 200,44 RON` 显示 `1.435 RON`，复制 `1234,56\t200,44\n`。 |
| 十语页面 | 1 | 十个 locale 的帮助和设置页面均实际加载，新增说明及选项文字与各自 JSON 一致。 |
| 固定调色板 | 1 | 逐一切换 10 个固定颜色，正文、灰显和统计文字的 30 组实际计算样式均达到 4.5:1。 |
| 中灰背景 | 1 | 自动浮层与灰底对比度达到 3:1，文字达到 4.5:1。 |
| 表格回归 | 3 | div grid、嵌套 table、colspan 表格均显示并计算，四个手柄出现；合并表格可用键盘缩小范围，无错误。 |
| 超长本地化数值 | 1 | 两个 `1.234.567.890,12 RON` 得 `2.469.135.780,24 RON`；列宽没有撑开，悬停标题及复制保留完整值。 |
| 启用算法设置 | 1 | 仅启用 SUM、MED 时菜单恰有这两项；选择 MED 得 `1320,950,1580,820`。 |
| 调整取消通知 | 1 | pointercancel 与 blur 分别恢复原 4×5 选区，后续仍可清除和选择，无错误。 |

实际查看了白底、深色和浅粉页面的运行截图：菜单、内层手柄、灰显、Toast 均可见，四边统计保留。截图只用于本次检查，不作为长期附件。

静态检查通过：`node --check scripts/active.js`、`node --check scripts/config.js`、`git diff --check`。逐一解析十个 messages.json，确认新增键集合完全一致、参数有对应 placeholders 声明、仅修改约定的 5 个旧消息；新增／修改 HTML 英文回退与英文消息逐项相同。manifest、package.json、background.js、inactive.js 与基线完全一致。

## 重复执行的方法

在独立临时目录安装 Playwright 1.65.0，使用系统 Chrome；不要把工具或输入写入仓库。基础 HTML 使用 lang=en、body margin=200px；表格宽 550px、border-collapse:collapse，td 为 border-box、宽 110px、高 60px、padding 8px。输入如下，单元格 ID 按 r0c0 到 r3c4 生成：

```js
const rows = [
  [1200,1360,1280,1440,'ready'],
  [860,920,980,1040,'review'],
  [1540,1480,1620,1720,'—'],
  [720,800,840,920,'archived']
];
table.innerHTML = rows.map((row,r) => '<tr>' + row.map((v,c) =>
  `<td id="r${r}c${c}">${v}</td>`).join('') + '</tr>').join('');
let actions = 0;
for (const kind of ['pointerdown','pointerup','mousedown','mouseup','click'])
  table.addEventListener(kind, () => actions++);
```

在表格外放 value="native text" 的 input 和普通按钮。使用临时 localhost HTTP server，复制／权限用浏览器实际剪贴板。主题输入分别设置 body 背景为 white、#10171e、#fff0f5、#808080；白表格场景在深底中额外设置 table 的白色背景。事件和界面计数通过 DOM 读取，不复制私有统计算法到测试程序。

扩展加载、工具栏触发方法沿用 [工具栏启停报告](2026-11-11-toolbar-only-selection.md) 引用的 CDP 方法。基础配置为 manual、numberFormat=auto、themeMode=auto、boxColor=#27ae60、上／左 AVG、右／下 SUM；启用默认十项算法，关闭异常高亮。等待 HiTableStyle attached 后从 r0c0 中心拖到 r3c4 中心。

手柄测试先取可见数据格中心及相应 HiTableResizeHandle 的中心，再 mouse.down → mouse.move（10 步）→ mouse.up；西北目标 r1c1，东北目标 r1c3，西南目标 r2c1，东南目标 r2c3。取消时在松手前按 Esc 或注入 pointercancel／blur。源表重建场景在按下后替换 table.outerHTML。扩展缓存场景先选 r1c1 到 r2c2，再将东南手柄拖向原 r3c4 的缓存位置。

复制使用 Meta+C，一次读取真实 clipboard，再立即执行第二次；分别检查原文、统计和反馈。拒绝测试执行：

```js
for (const permission of [
  {name:'clipboard-write'},
  {name:'clipboard-write',allowWithoutSanitization:true}
]) await cdp.send('Browser.setPermission', {permission,setting:'denied',origin});
```

测试后 resetPermissions，并恢复独立 context 的 clipboard-read／clipboard-write 权限。非安全 HTTP 使用当前测试 Chrome 的 `--host-resolver-rules=MAP insecure.hitable.test 127.0.0.1` 和 `--no-proxy-server`，仍访问同一临时本机服务器。实际网页中的按钮和输入框只通过真实鼠标／键盘操作，未替换 chrome API 或 navigator.clipboard 实现。

临时执行命令形式为 `node "$HITABLE_UI_TEST_DIR/tools/verify.cjs"`。本轮完整执行得到 passed=32、failed=0。测试脚本、输入、全部日志、JSON 过程结果、截图、浏览器 profile 和 npm 缓存仅用于当次测试，完成后清理；仅本报告进入 Git。

## 审查边界与未验证范围

- 自动配色读取 CSS 背景色及透明祖先，不分析背景图片、渐变图像或视频。已验证列出的背景场景与固定调色板，不宣称所有网页都能达到相同视觉对比。
- 未覆盖真实公共网站、真实触摸／笔、屏幕阅读器、超大表格性能、不规则缺格布局，以及超宽／超高选区的全面适配。合并格沿用既有逻辑网格取数语义，本轮没有重新定义其计数方式。
- 保留此前记录的宿主更早 window 捕获监听器边界和既有极小数行结果舍入限制；不宣称完全隔离网页 JavaScript，也不在 UI 改动中替换统计算法。
- 菜单键盘与 ARIA 设计参考 [WAI Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)；复制完成／失败处理参考 [Clipboard.writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)。本轮实际验证按上表范围，不构成完整无障碍认证。
