# 恢复 Shift 单击左上角全选

2026-11-11，基线 `137238e75e2015f685d344a52591887a7b214d01`。制作 0.2.2 商店说明时发现，旧说明中的 Shift 单击左上角全选已回归；用户确认原有快捷键约定。原说明保留，交互单独修复，不与宣传素材混入同一修复提交。

## 原因与最小修复

pointerdown 的 Shift／首行首列分支已经把终点设置到最后一格，但没有标记已开始选择。pointerup 又按普通点击的 4px 门槛清除了选区。真实 Chrome 修改前：Shift 单击左上角没有浮层；Shift 首列拖动为 3×7，首行拖动为 9×3。

在该专用分支内补充 dragStarted=true 和 selectCellsAndFillArray，使明确的快捷选择不必经过普通拖动门槛；普通点击和手柄拖动的 4px 判定均保持不变。沿用现有快照、指针捕获、统计、复制、取消与事件接管逻辑。

## 验证

macOS arm64，系统 Chrome 157.0.8103.39，Playwright 1.65.0，1280×900，干净临时 profile 加载实际源码扩展。真实鼠标、键盘、剪贴板及工具栏 action，无 Chrome API 模拟。

**12 个场景通过**：普通左上角单击无浮层；Shift 单击全选股票表 9×7；单次复制保留 Date 等表头及全部九行；Esc 清除；Shift 单击非角点仍不开启选区；Shift 首列拖选 3×7；Shift 首行拖选 9×3；普通拖选 2×2；快捷选择按下后 Esc 取消；财务表 Shift 全选 8×9；HTTP 页面真实工具栏激活后全选 2×2、网页 pointerdown 不执行，停用后恢复；无 pageerror。active.js 语法和 diff 检查通过。

复现：临时安装 playwright@1.65.0，系统 Chrome headless，保留扩展支持并传入 --enable-unsafe-extension-debugging，以 Extensions.loadUnpacked 加载源码。访问内置 demo，滚动至 #demo-sales；键盘按下 Shift，真实点击 rows[0].cells[0] 中心，再松开 Shift，检查 .HiTableDataCell 的行列。复制用 ⌘C 与 clipboard.readText。行列拖动分别从 [1,0] 到 [3,0]、[0,1] 到 [0,3]，普通拖动从 [1,1] 到 [2,2]，各 8 步。取消为 Shift pointerdown 后 Esc、pointerup。HTTP 输入为 10/20、30/40 的 2×2 HTML table，带源 pointerdown 计数器，通过 Extensions.triggerAction 启停。

仅验证受影响的快捷选择及直接回归路径，未重跑全部主题／语言矩阵。本报告归档后清理临时工具、profiles 和输入；没有测试过程文件进入 Git。0.2.2 发布包与商店素材在后续素材 PR 中一并更新，商店最终提审仍由用户操作。
