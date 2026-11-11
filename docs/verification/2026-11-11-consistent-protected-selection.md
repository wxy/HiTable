# 快照一致性与受保护拖选验证

日期：2026-11-11。基线：`ecaebcab866f33174ed550fffce1a822a2ece90c`（PR #60）。此前的故障证据见 [事件冲突研究](2026-11-10-table-event-interference.md)。本次实现修复，不更新版本、tag、Release、发布 ZIP 或商店。

## 修复与验收边界

- 在开始选取时冻结逻辑表格的文字、语言与布局；浮层、数值解析、统计、异常高亮、完整性分析和复制均从该快照读取。网页随后修改文字、tbody 或整个 table，不再导致显示新值却计算旧值。
- 选取模式使用 window 捕获阶段的 Pointer Events，并在拖选期间捕获指针。接管左键选择、兼容鼠标事件、捕获产生的进入／离开事件以及尾随 click；表格自身和 document 的处理器不会抢走这些手势。通过 closest 识别 span、链接和按钮内的单元格。
- 不删除、覆盖或重绑网页处理器。模式栏的“操作网页”清除快照并放行网页原有控件，“选取表格”恢复分析；Alt／Option 临时放行，扩展按钮停用并移除扩展监听器。Alt／Option 自身仍具有浏览器原有含义，例如某些浏览器的修饰键链接操作；需要普通链接点击时使用“操作网页”。
- Esc、区外点击、失焦和 pointercancel 清除选择；表格外松手仍能结束。单次复制使用冻结的数值／非数字原文；快速第二次复制包含浮层统计。输入框和可编辑内容保留原生复制。
- 浮层自身在冒泡阶段截断交互事件，避免其角按钮被网页的通用表格委托处理器误认成业务操作。
- 模式栏和帮助新增六个消息键，覆盖现有十种语言；README 同步操作说明。

**不保证阻止所有网页 JavaScript。** 网页更早注册在 window 捕获阶段的处理器仍可能先运行；如果它调用 stopImmediatePropagation，甚至会阻止扩展收到事件。浮层的冒泡隔离也不能撤销 document 捕获阶段已经执行的处理器。这里不修改网页 EventTarget、不暂停定时器、不关闭整个网页脚本。数据一致性不依赖所有业务事件都被成功阻止。若将来要求更强隔离，应另行设计独立快照视图；不能把本次手势拦截描述为完全隔离。

## 实际验证

环境：macOS arm64、Google Chrome **157.0.8103.39**、Playwright **1.65.0**；独立临时 profile、headless Chrome、真实未打包扩展及独立 localhost 页面。没有复用用户的浏览器 profile。拖选和复制使用 Playwright 鼠标／键盘输入；失焦和 pointercancel 场景注入对应通知来验证取消状态，未宣称模拟了操作系统切换窗口或真实触摸取消。

最终运行代码 SHA-256：

```text
scripts/active.js    64e5347232c54b0708d80e8e0aadcdca1a3982621ec2511495267b2372935c02
scripts/inactive.js  506e41309fec3fb9da74be79efa8ead563077c657899326fb69280c7d322bd0d
```

同一运行代码完成 **44 个检查，全部通过**：一次 43 项交互与回归验收，加一次异常高亮／完整性分析专项验证；两次之间没有运行代码变更。

| 范围 | 输入、操作与实际结果 |
| --- | --- |
| 基线及网页事件（17 项） | 2×2 表格 `10,20 / 30,40`；分别注册 mousedown、pointerdown、document 冒泡／捕获委托、mouseover、mouseout、pointerout、mouseleave、mouseup、click、阻断开始／结束传播、mouseup 重建 tbody，并测试 span／链接／按钮包裹数字。拖选首行均显示 `10,20`，SUM `30`，业务动作计数为 0，未导航。 |
| 更早的 window 捕获处理器 | pointerup 将源值改为 `50`，处理器确实执行一次；浮层仍为 `10,20`、SUM `30`，单次复制 `10\t20\n`。这是已验证的边界，不计作“网页事件已被全部屏蔽”。 |
| 动态源数据 | 按下后分别改文字为 `50`、替换 tbody、替换整个 table；松手后显示、SUM 和复制仍为 `10,20 / 30 / 10\t20\n`。 |
| 完成后更新与配置变化 | 源值改 `50`，复制仍为 `10,20`；快速第二次复制含统计 `30`。更改数字格式配置后仍显示冻结原文；Esc 后重选读取 `50,20`、SUM `70`。 |
| 结束和取消 | 表格外松手得到正常 SUM 与复制；拖选中 Esc、blur、pointercancel 均不留下浮层或选择标记，下一次拖选正常。区外点击清除快照，输入框恢复原生复制；双击不执行源表格 dblclick 动作。 |
| 网页操作恢复 | “操作网页”下按钮执行原处理器，链接正常更新 hash；切回选取后不再触发这些动作。停用后模式栏、浮层移除，按钮继续正常；再次激活仅一个模式栏，选择正常。Alt／Option 放行按钮；输入框及 plaintext-only contenteditable 的原生复制正常。 |
| 浮层按钮与委托事件 | document 对所有 table 的 pointerdown/up、mousedown/up、click 委托计数保持 0；点击右上角将行 SUM 切成 AVG `15`，源值已改 `50` 时仍按快照 `10,20` 计算并复制。 |
| 数字与表格回归 | `1.234,56 RON + 200,44 RON` 显示 SUM `1.435 RON`，复制 `1234,56\t200,44\n`；极小数 `1e-21` 的原文显示和数值复制不丢失；非数字 `label` 保留复制原文并跳过计算；colspan、嵌套 table、标记的 div grid 均能选择。Shift 左上角全选、单格选择正常。 |
| 快照语言 | en 表格 `1,234 / 2,345` 在拖选中把页面 lang 改为 ro，仍按原快照解释为 `1234 / 2345`，SUM `3579`。 |
| 异常与完整性分析 | 12×2 表格，第一列 `1..11,1000`、第二列各乘 10，启用异常高亮；拖选中第一格改 `999`。浮层首行 `1,10`、SUM `11`，末行 SUM `11000`，异常标记出现，复制全部 12 行原始快照；完整性分析路径执行，无页面或控制台错误。 |
| UI 与帮助 | 390×844 viewport，模式栏边界 `x=16,y=767,width=358,height=61`，实际截图检查可见；十种 locale 的扩展帮助页逐一加载，新增说明与对应消息内容一致。 |

静态检查：`node --check scripts/active.js`、`node --check scripts/inactive.js`、`git diff --check` 通过。逐一解析十个 messages.json，确认各新增同样六个非空键、所有已有消息完全保留、帮助中的按钮名与实际消息一致、HTML 英文回退与英文消息完全相同。manifest、后台脚本、权限和版本均未改变。

## 可重复执行的方法

基础输入沿用前一份报告的完整 HTML。将其保存到系统临时目录，执行：

```sh
python3 -m http.server 8769 --bind 127.0.0.1 --directory "$HITABLE_FIXTURE_DIR"
```

其中 HITABLE_FIXTURE_DIR 为本次创建的临时输入目录。用独立 Chrome profile 在 chrome://extensions 加载本仓库，打开该 localhost 页面并点扩展图标。统计配置为自动数字格式、上／左 AVG、右／下 SUM；事件测试关闭异常高亮。每次使用新页面，先注册矩阵中的单一网页处理器，再激活扩展；从第一行第一格中心拖到第二格中心，检查浮层、业务动作计数和 hash，复制到纯文本查看制表符分隔结果。

自动化本轮使用临时安装的 Playwright 1.65.0，启动系统 Chrome：

```js
const context = await chromium.launchPersistentContext(freshTemporaryProfile, {
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  viewport: { width: 1280, height: 900 },
  ignoreDefaultArgs: ['--disable-extensions'],
  args: ['--enable-unsafe-extension-debugging']
});
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const cdp = await context.browser().newBrowserCDPSession();
const { id } = await cdp.send('Extensions.loadUnpacked', { path: repositoryPath });
// 等待真实 extension service worker；使用其 chrome.storage.sync.set 配置 HiTable。
const { targetInfos } = await cdp.send('Target.getTargets', {
  filter: [{ type: 'tab', exclude: false }]
});
const tab = targetInfos.find(target => target.url === page.url());
await cdp.send('Extensions.triggerAction', { id, targetId: tab.targetId });
await page.waitForSelector('#HiTableSelectionMode');
// page.mouse.move → down → move({steps:12}) → up；
// 在 down 和 move 之间修改源 DOM，即可复现各快照场景。
// page.keyboard.press('Meta+c') 后，读取 navigator.clipboard.readText()。
```

主事件输入可按以下方式替换，动作计数应为 0：

```js
let actions = 0;
const a = document.querySelector('#a'), b = document.querySelector('#b');
b.addEventListener('mouseup', () => { a.textContent = '50'; actions++; });
// 委托：document.addEventListener('pointerdown', handler, true)，
// handler 仅处理 event.target.closest('#data')，修改 a 并增加 actions。
// 离开事件：a.addEventListener('mouseout' / 'pointerout' / 'mouseleave', handler)。
```

边界输入改成 `window.addEventListener('pointerup', handler, true)`，在激活前注册；此时动作计数应为 1，但浮层、SUM、复制仍为 `10,20 / 30 / 10\t20\n`。完成后点击“操作网页”再点源链接／按钮，验证正常业务动作，再切回选取并验证保护恢复。异常场景按上表生成 12 行，在 down 之后把第一格改为 999。

过程脚本、输入、完整日志、浏览器 profile、截图和基线源码副本仅用于本次验证，不进入 Git；本报告是长期保留的记录。

## 已知限制与未验证范围

- 基线和修复版均存在既有行结果舍入限制：两个 `0.000000000000000000001` 的行 SUM 显示 `0`。已用基线真实扩展对照复现；本轮极小数检查只验收显示原文和数值复制不丢失，不声称修复该精度策略。统计函数与舍入代码本次未修改。
- 未覆盖实际公共网站、特定 React／Vue 应用、真实触摸／笔、操作系统触发的取消、超大表格性能、虚拟滚动及拖选时容器滚动。合并前验证范围限于上面的真实扩展输入，不扩大为全站兼容性承诺。
- 模式栏保留原 DOM 的浏览器事件模型；对所有宿主脚本的完全隔离不是本次交付内容。没有新增权限、网络交互或外部服务。
