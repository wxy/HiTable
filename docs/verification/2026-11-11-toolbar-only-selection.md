# 沿用工具栏启停控制拖选

日期：2026-11-11。基线：`f337f93ba4777e872116069575525056aea4e345`（PR #61）。这是对同一修复的交互简化；不更新版本或发布包。

## 交互契约与改动

- 沿用已有工具栏图标作为手动启停入口：激活后由 HiTable 处理表格选择，停用后网页原有拖选、链接和按钮恢复工作。
- 移除新增模式栏、独立的 selectionEnabled 状态及 Alt／Option 放行分支。激活时按住 Alt 拖选也由 HiTable 处理，没有第二套网页操作模式。
- 保留开始选取时的数据快照、指针捕获、网页事件拦截、取消清理、单次／快速双次复制和非数字原文复制。Esc 只清除选区，不停用扩展；再次拖选读取最新快照。
- 删除十种语言各五个无用模式栏消息，更新同一个帮助段落和 README。所有其他翻译、后台启停／自动激活策略、停用清理脚本、权限与 0.2.1 版本号均未改变。
- [前一份报告](2026-11-11-consistent-protected-selection.md) 保留其历史测试结果，并标注模式栏方案已被本次调整替代。

## 环境与结果

macOS arm64、Google Chrome **157.0.8103.39**、Playwright **1.65.0**，使用独立临时 profile 加载真实源码扩展。由 CDP Extensions.triggerAction 触发真正的工具栏事件，通过 Playwright 鼠标／键盘执行拖选、修饰键和复制；未模拟 chrome API，未复用用户浏览器。

运行代码 SHA-256：

```text
scripts/active.js      941fd56c55885123f2a3a25338aaef65e7285bd234900a557ff22a369b6cbd4c
scripts/inactive.js    506e41309fec3fb9da74be79efa8ead563077c657899326fb69280c7d322bd0d
scripts/background.js  35922d485c6be790310865eef2e65686e9f92d7d91661cab852f019f5da975a9
```

基线先运行 4 项相关检查：原有工具栏启停和停用后链接／按钮恢复通过；“无第二模式栏”和“Alt 不放行”按新契约失败，分别观察到模式栏数量 1 和网页拖选计数 1。这是待简化的既有行为，不是测试环境故障。

最终同一运行代码完成 **17 项端到端检查，全部通过**：

| 检查 | 实际观察 |
| --- | --- |
| 停用 → 激活 → 停用 → 再次激活 | 网页原生拖选计数依次 `1,1,2,2`；HiTable 激活时浮层 `10,20`、SUM `30`、复制 `10\t20\n`；停用后无浮层或选择标记，再次激活只有一个浮层。 |
| 无模式栏 | 激活后没有 HiTableSelectionMode 元素，拖选仍正常。 |
| Alt 拖选 | 激活时网页 pointerdown／pointerup 计数均为 0，HiTable SUM `30`，复制 `10\t20\n`。 |
| 6 项受保护拖选 | 普通单元格、网页阻止 mousedown／mouseup 传播、网页 mouseup 改值、span／链接／按钮包裹数字；均为浮层 `10,20`、SUM `30`，网页拖选计数为 0，未触发链接或按钮动作，无页面或控制台错误。 |
| 2 项动态源数据 | 按下后分别把第一格改 `50`、替换整个 table 为 `100,200`；浮层和单次复制仍为 `10,20`，SUM `30`，快速第二次复制包含同一份数据和统计，无错误。 |
| Esc | 清除浮层后扩展仍激活；源值改 `50` 后重新拖选得到 SUM `70`、复制 `50\t20\n`，网页原生拖选计数仍为 0。 |
| 表格外松手 | 正常结束，SUM `30`、复制 `10\t20\n`。 |
| 停用后的原网页控件 | 点击工具栏停用后，原链接正常导航至 #original，按钮原 onclick 执行一次。 |
| 原生输入框复制 | 激活并选取后，点击输入框并复制得到 `native text`。 |
| 罗马尼亚数字 | `1.234,56 RON + 200,44 RON` 得 SUM `1.435 RON`，复制 `1234,56\t200,44\n`。 |
| 十种语言帮助 | 逐一打开十个 locale 帮助页，段落与各自 messages.json 相同，均包含 Esc 说明且无 Alt／Option 放行说明。 |

静态检查通过：`node --check scripts/active.js`、`git diff --check`；十个 JSON 均可解析，每种语言恰好删除五个模式栏键并更新 helpSelectionMode，其他消息原样保留；HTML 英文回退与英文消息一致。当前运行代码、README 和帮助没有被移除 UI 的残余引用。manifest、package.json、background.js、inactive.js 与基线完全一致。

## 重现输入与步骤

在系统临时目录内创建 localhost 测试页：HTML 语言为 en，body margin 100px；2×2 table 的单元格为 `10,20 / 30,40`，宽 150px、高 60px、padding 10px，第一行两个单元格分别标记 id=a 和 id=b。table 的 pointerdown 和 pointerup 分别累加独立计数；table 外放置 value="native text" 的 input。执行：

```sh
python3 -m http.server 8769 --bind 127.0.0.1 --directory "$HITABLE_FIXTURE_DIR"
```

HITABLE_FIXTURE_DIR 是本次创建的临时输入目录。使用独立 Chrome profile 加载仓库，打开该页面，按下述方法操作：

1. 从 a 中心拖到 b 中心，记录网页计数；点击 HiTable 工具栏图标激活，再拖选并检查浮层／复制；停用、再次激活后各重复一次。
2. 激活时按住 Alt 拖选，确认计数不增长；激活页面不存在额外模式栏。
3. 单独为 table 注册阻断 mouse 事件传播的处理器或 mouseup 改值处理器，再激活并拖选；分别把单元格内容包进 span、a 或 button 重复验证。
4. 在 mouse.down 和随后 mouse.move 之间，通过页面脚本修改 a.textContent 或整个 table.outerHTML；松手后复制一次，再快速复制一次，检查冻结数据和统计。
5. Esc 后改源值重选；在表格外松手；停用后点击原链接／按钮；在输入框选中文字并复制。
6. 数字场景将 lang 改 ro、首行替换为上表的两个 RON 数值；帮助场景逐一访问 pages/help.html?locale=en、zh_CN、zh_TW、zh_HK、ro、de、ru、ja、ko、hi。

自动化启动参数、实际扩展的 Extensions.loadUnpacked／Extensions.triggerAction 与配置方法沿用前一份报告。由于模式栏已移除，激活就绪条件改为 `page.waitForSelector('#HiTableStyle', {state:'attached'})`，停用则等待同一元素 detached。配置为 manual、auto 数字格式、上／左 AVG、右／下 SUM、关闭异常高亮。

本轮仅重验受本次删减影响的路径，没有重复完整 PR #61 的 44 项验收。更早注册的 window 捕获处理器可能先运行这一边界、既有极小数行结果舍入限制均保持不变；未验收公共网站、真实触摸或超大表格性能。不新增权限、依赖或网络服务，不发新版。

临时脚本、测试输入、完整日志、独立 profile 和 npm 工具缓存均不进入 Git，测试结束清理；长期只保留本报告。
