# 多格式剪贴板与 Markdown 复制验证

日期：2026-11-13。基线：`108b9419ba09abc654000e9884b4b3edd22ac3e0`（origin/master）。范围仅为复制输出、快捷键及帮助说明；不修改版本、权限、发布包或商店。

## 行为契约

- Ctrl+C／Mac ⌘C：一次写入同一 ClipboardItem 的 text/plain（TSV）和 text/html（标准表格及基础内联样式）。目标应用选择格式。
- Ctrl+X／Mac ⌘X：只写 Markdown 纯文本，不修改网页源数据。
- 在 500ms 内再次按下同一个复制快捷键，包含四边统计和算法名称。切换 C/X、重新选择范围会重置连续按键判断；按住键的自动重复不算第二次按键。
- 单次复制沿用既有数值归一化；包含统计时沿用浮层的显示文本。非数值原文保留。
- Markdown 识别选区首行是否全部为真实 TH；无表头时添加空表头，保留全部数据行。带统计的首行作为 Markdown 表头。转义竖线、反斜线、行内 Markdown 标记和 HTML 字符，单元格内换行用 `<br>` 表示。
- HTML 以文本节点构建单元格，保留单元格换行，使用中性边框、留白、对齐与统计区底色，不携带网页交互节点、脚本或依赖网页样式表。
- 沿用复制成功／失败提示，新增显示输出格式。输入框、textarea 和可编辑内容保留原生复制、剪切；未提交拖选时不复制。

## 环境和方法

macOS arm64、Google Chrome **157.0.8103.52**、本机 bundled Playwright，加载真实工作区扩展；所有测试文件与 Chrome profile 均在本次系统临时目录。

内置浏览器连接因 executor 的符号链接 writable-root 配置错误无法启动；没有修改用户配置。改用独立临时 Chrome 进程，不连接或读取用户现有 profile。由 CDP `Extensions.loadUnpacked` 加载扩展、`Extensions.triggerAction` 触发真实工具栏入口，使用实际鼠标／键盘和系统剪贴板；没有替换 chrome API 或 navigator.clipboard。

通过 `navigator.clipboard.read()` 检查实际 MIME 类型与内容；在原生 contenteditable 和 textarea 中使用 ⌘V 检查真正的粘贴。Markdown 使用 bundled `marked` 的 GFM 解析器检查实际输出表格的行列与文本。

运行代码 SHA-256：

```text
scripts/active.js   dfa0cc4dbfefa85d56aaf0be7cb1f17ec7ad7289c54e759d72f89ee61ca9b60b
scripts/inactive.js 308f3119e81a5c8de895fddd73b2388c7c4c5b5fe7877d418d4859dda6642ccf
```

## 结果

共 **23 项场景验证通过**。首轮 22/23；唯一失败来自测试把空 contenteditable 的 innerText 预期为空字符串。无扩展的独立 Chrome 对照确认，原生剪切后 DOM 为 `<br>`、textContent 为空、innerText 为换行。改为检查 textContent 和实际剪贴板后，该项定点复验通过；实现代码未变。另定点复验两种复制方式的权限拒绝，分别等待新失败提示，避免复用上一条提示造成误判。

| 检查范围 | 实际结果 |
| --- | --- |
| C 单次 | 实际剪贴板恰有 text/html、text/plain；TSV 为 `10\t20\n30\t40\n`，HTML 为同样的 2×2 数据，有内联边框，无交互元素。 |
| C 双次 | TSV 与 HTML 均为 4×4，四边统计均存在，底部两列 SUM 为 40、60；各格式单元格逐项相同，无额外尾部空列。 |
| X 单次 | 实际剪贴板仅 text/plain；空表头、分隔行后完整保留 `10,20 / 30,40` 两行数据，源表内容不变。 |
| X 双次 | 仅 Markdown 纯文本；GFM 解析后为包含四边统计的 4×4 表格，底部 SUM 为 40、60。 |
| 快捷键序列（4 项） | C→X、X→C 均从不带统计开始；超过 500ms 后仍为单次；新选区重置连续按键判断。 |
| 表头与单格（2 项） | 真实 TH 表头只出现一次；无表头单格得到空表头与一条数据，GFM 能解析。 |
| 特殊文本 | 字面 `<img src=x onerror=alert(1)> & *a*`、`a|b\c`、反引号、下划线、方括号及单元格换行在 HTML 与 Markdown 中均保留；解析后无 img、script 等注入元素。 |
| 罗马尼亚数字 | `1.234,56 RON / 200,44 RON / 2,50 / 3,75` 的单次复制保持既有归一化为 `1234,56 / 200,44 / 2,5 / 3,75`，三种输出一致。 |
| 数据快照 | 源表首格在选取后改成 999，TSV、HTML、Markdown 仍复制冻结的 10。 |
| 实际粘贴（3 项） | 原生富文本区收到可编辑 2×2 表格且边框为 1px；textarea 收到 TSV；Markdown 粘贴到富文本区仍为字面文本而非 HTML 表格。 |
| 原生操作（2 项） | 存在 HiTable 选区时，input 的复制和剪切正常；contenteditable 剪切后文本为空、剪贴板为原文字。 |
| 修饰键和按住（2 项） | Mac 上 Meta 与 Control 路径均验证；按住 X 的自动重复不会复制统计。此结果不等于 Windows 实机验收。 |
| 权限拒绝 | CDP 拒绝 clipboard-write 和 allowWithoutSanitization 两种描述，C 和 X 各自产生新的失败提示，无未捕获异常。 |
| 停用 | 浮层清除、源表未改变，网页原点击恢复。 |
| 十语帮助 | en、zh_CN、zh_TW、zh_HK、de、ru、ja、ko、hi、ro 的实际帮助页均显示 TSV/HTML 与 Markdown 快捷键。 |

页面无未捕获异常。静态验证通过：

```sh
node --check scripts/active.js
node --check scripts/inactive.js
git diff --check
```

逐一解析十个 messages.json，与基线相比仅改动 helpUsage5、helpUsageDoubleCopy、helpShortcutCopy，并新增 helpShortcutMarkdown；HTML 英文回退逐项与英文消息相同。manifest、依赖和构建配置未变，因此未执行构建和无关回归。

## 重现输入和命令

在系统临时目录生成并启动 localhost 页面。HTML 为 lang=en；body margin=160px，字体 16px Arial；表格 border-collapse=collapse，单元格宽160px、高60px、padding8px、1px 边框。输入按 row/col 生成 id=r0c0 等：

```js
const rows = [['10','20'],['30','40']];
table.innerHTML = rows.map((row,r) => '<tr>' + row.map((v,c) =>
  `<td id="r${r}c${c}">${v}</td>`).join('') + '</tr>').join('');
```

表格外加入 value="native text" 的 input、空 textarea、空 contenteditable。源表 click 累加 window.actions。变体输入见结果表；真实表头变体为 `Name,Value / A,10`，首行使用 TH；数字变体将 html lang 改为 ro。特殊文本必须先转义为文本，换行生成 BR。

```sh
HITABLE_COPY_TMP="$(mktemp -d "${TMPDIR%/}/hitable-copy-check.XXXXXX")"
# 将上述 HTML 输入保存为 "$HITABLE_COPY_TMP/index.html"
python3 -m http.server 8769 --bind 127.0.0.1 --directory "$HITABLE_COPY_TMP"
```

可用 Chrome 的“加载已解压的扩展”加载当前功能分支，在 http://127.0.0.1:8769 激活 HiTable，从 r0c0 中心拖到 r1c1 中心。配置：manual、numberFormat=auto、top/left AVG、bottom/right SUM、关闭异常高亮。按结果表逐项执行，连续两次按键间隔小于500ms；到 textarea 或富文本区中用正常粘贴，检查行列、样式和可编辑性。

自动化可使用 bundled Playwright 的 `chromium.launchPersistentContext(HITABLE_COPY_TMP + '/profile', {channel:'chrome', headless:false, ignoreDefaultArgs:['--disable-extensions'], args:['--enable-unsafe-extension-debugging']})`。在 browser CDP session 上调用：

```js
const {id} = await cdp.send('Extensions.loadUnpacked', {path: repositoryRoot});
// 页面先导航到 localhost 并置前；targetId 必须来自 tab 类型，而非 page 类型。
const {targetInfos} = await cdp.send('Target.getTargets', {
  filter: [{type:'tab', exclude:false}]
});
const targetId = targetInfos.find(t => t.url.startsWith(origin)).targetId;
await cdp.send('Extensions.triggerAction', {id, targetId});
```

用真实 mouse 拖选、keyboard.press('Meta+c'/'Meta+x') 操作；每次等待新复制提示后再通过 navigator.clipboard.read 读取，以保证检查的是本次完成的写入。剪贴板权限为 clipboard-read、clipboard-write；权限拒绝场景依次设置 `{name:'clipboard-write'}`、`{name:'clipboard-write',allowWithoutSanitization:true}` 为 denied，C/X 分别等待新失败提示，结束后 resetPermissions。

本次实际临时执行命令为 `node "$HITABLE_COPY_TEST_DIR/verify.cjs"`；定点复验为 `CASE_FILTER='native contenteditable' node "$HITABLE_COPY_TEST_DIR/verify.cjs"` 与 `CASE_FILTER='denied clipboard' node "$HITABLE_COPY_TEST_DIR/verify.cjs"`。测试脚本、profile、JSON、完整日志和下载缓存均为过程文件，报告记录完成后删除，只有本报告入库。

## 验收边界

- 本机未安装 Word、Excel，未验收真实 Office 桌面或在线版本；原生 contenteditable 粘贴不代替这些应用验收。
- 未验收公众号、Notion 等真实文章编辑器的过滤规则，未验证所有编辑器对样式和数字类型的处理。
- 未覆盖 Windows/Edge 实机、超大表格性能或所有不规则合并格；保持既有逻辑网格展开和数字解析行为。
- HTML 提供结构和基础样式，接收应用可能调整排版。Markdown 只提供纯文本，避免接收方优先读取 HTML。
- API 参考：[Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)、[GFM tables](https://github.github.com/gfm/#tables-extension-)；modern-web-guidance 的 copy-button 指导用于沿用异步成功／失败反馈，不增加新复制按钮或兼容层。
