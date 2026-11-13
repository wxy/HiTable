# PR #70 复制审核意见验证

日期：2026-11-13。基线：master `82a5e8dad47592001dedd961ba348b604bdfd0cc`。仅处理 PR #70 两条审核意见，不改变复制快捷键、格式选择、统计算法或权限。

## 原因与修复

1. 缺格表格的逻辑网格用 NaN 表示缺失单元格，但没有对应原始文本；原 TSV 的 join 会输出空字段，新 HTML/Markdown 字符串序列化会抛错。输出行构造时统一将缺失原文转成空字符串；同一合法缺格也用于表头识别，避免首行 TH 后的缺格触发属性访问错误。
2. GFM 的 ~ 与 ~~ 可表示删除线。将 ~ 加入既有行内 Markdown 转义字符集合，保留网页的字面文本。

实现只改 scripts/active.js 三行。验证时该文件 SHA-256：`bc98c3923f1bf56b9f184a2d5ac6362cf3cbc4e7aba4b932a32c5fc6e2806ccd`。

## 方法和输入

macOS arm64，Chrome 157.0.8103.52，bundled Playwright 与 marked GFM 解析器。独立临时 Chrome profile 通过 Extensions.loadUnpacked 加载真实扩展，通过 Extensions.triggerAction 触发工具栏；鼠标拖选、Meta+C/X、系统剪贴板读写均使用真实路径，没有替换 chrome API 或 navigator.clipboard。

本地 HTTP 输入页：lang=en，body margin160px，td/th 宽160px、高60px、padding8px、border1px；表格外有 value="native text" 的 input。逐行生成 table/tr/td，单元格 id 为 r0c0 等，首行表头变体使用 TH。将单元格值作为文本转义插入，避免输入自己产生格式。

```js
const ragged = [['10','20'], ['30'], ['40','50']];
const firstHeader = [['Value'], ['30','40'], ['50','60']];
const literal = [['~~cancelled~~','~single~'], ['a|b\\c','<tag> & `code`_*[x]']];
const regular = [['10','20'], ['30','40']];
```

配置为 manual、numberFormat=auto、上/左 AVG、下/右 SUM、conditionalFormatting.enabled=false。每次导航后等待 HiTableStyle，置前页面，再从首格中心拖到末行末格中心。复制后等待新的 Toast 完成，再用 navigator.clipboard.read 检查 MIME 和内容；Markdown 用 marked 解析并读取真实 HTML 表格文本，检查没有 del/s 节点。

## 实际结果

修复前确认：缺格表格 C 与 X 都显示复制失败；字面 `~~cancelled~~` 和 `~single~` 被解析为删除线，符号丢失。

修复后覆盖八项：

| 场景 | 结果 |
| --- | --- |
| 中间行缺格 C | 同时写入 TSV/HTML；TSV 为 `10\t20\n30\t\n40\t50\n`，HTML 保留 3×2 网格及空格位。 |
| 中间行缺格 X | 仅 Markdown 纯文本；GFM 解析保留所有数据和空格位。 |
| 首行 TH 后缺格 C / X（2项） | 均能复制，保留 Value 后的空单元格；Markdown 补空表头，不删除数据。 |
| 字面符号单次 X | ~、~~、竖线、反斜线、反引号、下划线、方括号、HTML 字符在 GFM 解析后与来源逐项相同，无删除线或注入节点。 |
| 字面符号双次 X | 包含四边统计的 4×4 表格，数据区原文字面符号保留，无删除线。 |
| 正常表格单/双次 C | TSV 与 HTML 类型保持；单次 2×2，双次 4×4，底部 SUM 为 40、60。 |
| 来源与原生剪切 | 网页字面文本不变；input 中 Meta+X 仍剪切原文字，未被 Markdown 操作接管。 |

首轮修复后七项通过，一项在复制前未形成选区。带浏览器错误和焦点观测的定点运行确认该项复制通过，实现未再改动。基线测试也出现过一次拖选未形成浮层；本次验证仅证明形成有效选区后的复制修复，不宣称定位或修复该偶发拖选现象。

执行命令为 `node "$HITABLE_REVIEW_TEST_DIR/verify.cjs"`（基线）、`node "$HITABLE_REVIEW_TEST_DIR/verify.cjs" --fixed`（修复后）；定点复验使用 `CASE_FILTER='ragged first header cell c' node "$HITABLE_REVIEW_TEST_DIR/verify.cjs" --fixed`。测试脚本按上述输入和操作生成，仅用于本次验证；报告完成后删除脚本、输入、profile、截图和 JSON，不入库。

静态检查通过：`node --check scripts/active.js`、`git diff --check`。未运行无关模块、构建或完整回归；未验收真实 Word/Excel、Windows/Edge，也未扩大到全部不规则表格渲染行为。
