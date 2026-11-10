# 表格宿主事件与 HiTable 拖选的冲突研究

日期：2026-11-10。测试源码：`7136a991cef9b2061388c79a4c5f60bda3f3bae3`。`scripts/`、`pages/`、`assets/`、`_locales/` 与 `manifest.json` 均与 `v0.2.1` 相同。本轮只研究和记录，不修改运行逻辑，不增加权限，不发布版本。

## 结论

用户提出的风险已经在真实扩展中复现。当前拖选可能触发网页业务事件；事件也可能阻止选择完成。更严重的是，浮层内容和统计值可能来自不同时间的数据：**浮层显示 50 和 20，而同一行的 SUM 仍为 30**。

这比增加一个与统计无关的新功能更值得优先处理。下轮应先保证显示、计算、复制共用同一份数据快照，再验证能够避开原表格业务事件的明确选取模式。本报告的方案部分尚未实现或验证，不能当作已修复。

## 环境与方法

- macOS arm64；Google Chrome **157.0.8103.39**；Playwright **1.65.0**。
- 使用独立的临时 Chrome profile，以 `Extensions.loadUnpacked` 加载真实源码扩展，以 `Extensions.triggerAction` 激活；不是模拟 `chrome` API，也没有在普通页面中复制解析器。
- 临时 HTTP 页面先注册自身事件，然后激活 HiTable。Playwright 发送真实鼠标移动、按下、拖动和松开；记录到的鼠标事件 `isTrusted` 全部为 true。
- 所有场景使用相同 2×2 表格，首行为 `10, 20`，次行为 `30, 40`。从首行第一格中心拖到第二格中心。统计配置为左／上 AVG、右／下 SUM，自动数字格式；关闭异常高亮以隔离事件影响。普通静态表格的行 SUM 为 `30`。
- 共完成 **12 个场景**，均无未捕获的页面异常。下表记录的是观察结果，不是宣称所有场景通过产品验收。没有测试实际公共网站或 React/Vue 框架，无法据此量化受影响网站的比例。

## 实际结果

| 场景（网页自身注册的处理器） | 观察结果 |
| --- | --- |
| 静态纯文本单元格，无业务处理器 | 浮层 `10, 20`，SUM `30`，正常基线 |
| 第一格 `mousedown` 将自身改为 `99` | 原页面动作执行一次，SUM 变为 `119` |
| 页面先注册的 document 冒泡 `mousedown` 将第一格改为 `99` | 原页面动作执行一次，SUM `119`；HiTable 未隔离委托事件 |
| table 的 `pointerdown` 将第一格改为 `99` | 动作在鼠标处理之前执行，SUM `119` |
| 第二格 `mouseover` 将自身改为 `200` | 拖动触发页面动作，SUM `210` |
| 第二格 `mouseup` 将第一格改为 `50` | 源表格和浮层显示 `50, 20`，但上下统计仍为 `10, 20`，行 SUM 仍为 `30` |
| table 的 `click` 修改 `location.hash` | 拖选松手后触发页面动作，hash 变为 `#site-action`；激活状态下单击也触发 |
| table 的 `mousedown` 调用 `stopPropagation()` | HiTable 收不到开始事件，无浮层 |
| table 的 `mouseup` 调用 `stopPropagation()` | 无统计浮层，两个源单元格仍留有选择标记 |
| 第二格 `mouseup` 将 tbody 重建为 `100, 200 / 300, 400` | 源表格变化，选择未完成，无浮层 |
| 数字包在 span 中，从 span 文字处拖动 | 没有浮层；直接 event.target 不是可选单元格 |
| 数字包在链接中，从链接文字拖动／单击 | 没有浮层；单击仍导航至 `#link-action` |

## 根因与代码依据

1. `scripts/active.js` 的 `init()` 使用不带 capture 的 document 级 `mousedown`、`mouseover`、`mouseup` 监听器。网页的捕获、目标及较低层冒泡处理器可以先运行；页面已有的同目标监听器也已经被调用。研究中的 mousedown 日志顺序为 document capture → table bubble → 页面 document bubble，各处 `defaultPrevented` 均为 false。HiTable 随后调用 `preventDefault()` 和 `stopPropagation()`，只能影响尚未发生的默认动作和后续传播，不能撤销之前的业务处理器。
2. HiTable 没有 `pointerdown` 或 `click` 隔离逻辑，mousedown 的默认动作取消也不等于取消所有页面 click 处理器。
3. `selectCellsAndFillArray()` 在拖动的 mouseover 阶段写入数值缓存。mouseup 阶段的 `showOverlay()`／`copyCell()` 又从实时 DOM 取内容，而 `calculation()` 仍使用先前的缓存。这解释了 `50 + 20` 显示为 `30`，不需要假设异步线程或极端并发。
4. `isSelectableCell(event.target)` 没有沿 DOM 向上解析真正的单元格，所以文字包装元素和交互控件命中路径不同。DOM 在 mouseup 时被替换，也可能使原事件目标失去 table 祖先，从而跳过结束处理。
5. `copyCell()` 会移除浮层内容里的交互元素，但这个处理发生在拖选完成以后，不能保护原表格上的首次拖选。

标准依据：[DOM 的事件分发与监听器调用顺序](https://dom.spec.whatwg.org/#concept-event-dispatch)。Chrome 的 [content script 隔离世界](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#work_in_isolated_worlds) 隔离 JavaScript 变量，并不隔离共用 DOM 上的事件；官方示例也展示页面与扩展的 click 处理器均会执行。

## 最小人工复现

将以下内容写入系统临时目录内的 `fixture.html`，在该目录执行 `python3 -m http.server 8769 --bind 127.0.0.1`。使用独立 Chrome profile 加载源码扩展，打开 `http://127.0.0.1:8769/fixture.html`，点击 HiTable 图标激活，然后从第一行 `10` 的单元格中心拖到 `20` 的中心并松手。

```html
<!doctype html><html lang="en"><meta charset="utf-8">
<style>body{margin:100px}td{width:160px;height:70px;border:1px solid;padding:10px}</style>
<table id="data"><tr><td id="a">10</td><td id="b">20</td></tr>
<tr><td>30</td><td>40</td></tr></table>
<script>
document.querySelector('#b').addEventListener('mouseup', () => {
  document.querySelector('#a').textContent = '50';
});
</script></html>
```

预计观察到：浮层首行为 50、20，右侧 SUM 为 30。删除该事件处理器后，相同拖选得到 10、20、SUM 30。其他场景分别将处理器替换为上表描述的事件、目标和动作；链接使用 `<a href="#link-action">`，包装文字使用 `<span>`。

## 建议的下一轮范围（尚未实现）

1. **数据一致性先行。** 明确定义取数时点，让浮层文字、单元格有效状态、统计与复制使用同一份不可变快照；提供明确的“重新读取”动作，避免悄悄混用旧数值与新 DOM。
2. **明确的受保护选取模式。** 考虑选表后在独立快照／交互层内选取与统计，配合可见的模式状态和退出入口。普通浏览时保留链接、按钮、输入框和表格自身操作；分析时避免把选区手势交给原表格。需要特别验证 pointerdown、mouseup 后的 click、嵌套文字和重建 DOM。
3. **完整的手势结束与取消。** 验证在表格外松手、页面阻断 mouseup、取消和停用后，是否仍有残留标记或拖选状态。

不建议直接把所有事件改成全局捕获并无条件 `stopImmediatePropagation()`：它可能打断网页正常操作，也不能撤销更早的捕获处理器。Shadow DOM 本身也不是事件隔离保证。上述取舍需要下一轮真实交互验证，不应仅靠增加几个阻断调用就宣称解决。

本次不引入 AI、不新增权限、不更新版本或发布包。浏览器 profile、测试工具、输入页面和完整日志只保留到本次研究结束；本报告是唯一长期保留的测试记录。
