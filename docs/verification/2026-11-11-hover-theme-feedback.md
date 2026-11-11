# 悬停高亮与主题选择反馈验证

日期：2026-11-11。基线：`42eb495903a067f1d17372db881ad49cdb50facf`，继续更新 PR #63，等待用户本地验收，不合并、不发布。

## 反馈、原因和最终行为

- 数据区当前行列使用外圈统计带的深色及其文字色；对应外圈统计格使用数据区的浅色及其文字色。移除悬停 outline，仅切换背景／文字颜色；保留固定的细亮网格及选区框。非数值继续灰显。
- 四角悬停方向高亮曾丢失：角点 mouseover 先设置对应统计带高亮，随后冒泡到表格的通用处理器；后者清除所有高亮，并把角点当作无需高亮的情况返回。基线实测四角对应高亮数量均为 0。现在由同一悬停处理器按按钮方向选择统计带，去掉相互覆盖的角点监听器。悬停高亮方向，点击仍打开算法菜单；不更换这两个动作。
- 蓝色主题的可复现路径：全新设置默认 auto，但绿色 radio 同时显示 checked；再次点击已选绿色不会触发 change，存储仍为空，实际继续自动配色。演示页标准表格的 `tr:hover td` 为 `rgb(240,247,255)`，旧实现采样按下的单格，选出了 `#1f5e9d` 蓝色。CSS／ARIA Grid 没有这条单行悬停样式，因而表现不同。此结论来自独立临时 profile，未读取用户个人浏览器配置。
- 自动选项改为与十个固定颜色同组的多彩色块，取消独立下拉框；同一时刻只有一个选中项。选择纯色直接保存 fixed，选择多彩色块保存 auto 并记住上次固定颜色；已有缺少 themeMode 的配置仍按固定色处理。打开设置不会擅自重写存储。
- 自动配色改为采样表格容器及祖先的背景，避开单格临时的行悬停底色。固定绿色在所有演示表均保持 `#27ae60`；自动模式下白底为 `#16804a`，深底为 `#44d7b6`，浅粉为 `#a3214c`。
- 十语设置说明及帮助、HTML 英文回退、README 同步新的色块入口。自动按钮有本地化标签／原生 title，保留原生 radio 操作并提供键盘焦点样式。

上一轮[尺寸与拖选反馈报告](2026-11-11-selection-ui-feedback.md)记录的统计格 1px 悬停 outline 已被本次背景互换取代；选区框与普通网格仍为细线。财务表选不中／松手消失继续保持未复现，本轮未将其宣称为已修复。

## 环境与运行版本

macOS arm64，Google Chrome **157.0.8103.39**，Playwright **1.65.0**。使用独立临时 profile 和真实 Extensions.loadUnpacked，直接访问扩展的 pages/demo.html、pages/config.html；执行真实鼠标、设置保存和页面重载，未模拟 chrome API。主 viewport 1500×1100，不使用用户已有 profile。

```text
scripts/active.js 607e42f0e3732cc4a3960e5d8cd164898e52d98bb34af2159d902e5c61aed476
scripts/config.js 46cc4fc56b36e07f2ff95bf77e8e2541af8650f463afa14fb6893b2357ee1828
assets/main.css cc98b055c7d97eeb55cee72430732fc365b3d358cc68a71a2841facce1a04bd7
pages/config.html ac2ad7a366c73126d854d94011ded6f59e4d2b38cb86ca44c9d68c56c64d6080
```

## 实际验证

**10 项悬停检查 + 16 项主题检查全部通过。** 四角修复前的预期检查均观察到高亮格数为 0；最终为上／下各 9 格、左／右各 7 格。曾有颜色测试把 computed outlineWidth 默认值 3px 误判成实际绘制；读取 outlineStyle 后确认其为 none，纠正断言后复验通过，没有为通过测试添加额外 CSS 分支。

| 范围 | 实际结果 |
| --- | --- |
| 内外背景互换 | 财务表 7×9 选区中悬停第三行第四列，14 个可计算数据格使用原统计带背景／文字色，4 个对应统计格使用原数据区背景／文字色；outline-style 为 none。悬停前后所有浮层格 DOMRect 完全一致。 |
| 四角与方向 | 悬停每个算法按钮的 span，恰好高亮其控制的统计带，分别为 9、7、9、7 格；不会高亮数据区，也不会自动打开菜单。 |
| 四边统计格 | 悬停上／下的一个统计格，高亮 7 个对应数据格；悬停左／右则为 9 个。保留原来不高亮对面统计格的行为。 |
| 灰显与菜单 | 行列高亮经过非数值 SKU 时仍灰显；移出浮层清除全部高亮。点击角点可开菜单、选择 AVG 并保留选区。 |
| 浅色主题 | 固定 `#44d7b6` 时内外背景和配套文字色交换正确：浅底深字、深底白字；尺寸不变。实际查看运行截图。 |
| 自动入口 | 配置页有 11 个同组 radio，默认仅 auto 选中；不存在 themeMode 下拉框；多彩按钮使用 conic-gradient，并带本地化 title。首次打开设置不写存储。 |
| 固定绿色 | 点击绿色后存储立即为 themeMode=fixed、boxColor=#27ae60。标准股票表、财务表、合并格、嵌套财报、完整性表、罗马尼亚数字表、CSS Grid、ARIA Grid 的浮层均为该绿色。 |
| 保存／重新加载 | 重载设置仍选绿色；改变数字格式保持固定绿色。切 auto 后再改变条件格式，仍为 auto，并保留上次固定色。 |
| 稳定背景采样 | 源表真实悬停格仍为浅蓝 `rgb(240,247,255)`，自动浮层为绿色 `#16804a`。将该表所在 section 的背景分别设为深色和浅粉，得到亮青绿和深莓红。 |
| 旧配置兼容 | 将不含 themeMode 的旧蓝色配置写入独立存储，重载设置后仅蓝色选中、存储未被重写，浮层仍为 `#2980b9`。 |
| 十语与错误 | 十种语言逐一实际加载设置页，自动按钮 title 与 themeAuto 消息一致，themeHelp 说明对应各自 JSON；两组测试全程 pageerror 和 error 级 console 均为空。实际查看多彩色块配置截图。 |

静态检查通过：`node --check scripts/active.js`、`node --check scripts/config.js`、`git diff --check`。逐个解析十语 JSON，确认仅更新 themeHelp／helpThemeSelection 两个键、键集合不变；设置与帮助英文回退逐字匹配英文消息。manifest、package.json、background.js、inactive.js 未改变。

原发布 ZIP 的 SHA-256 仍为 `6badcdacacd2629c0ca5fa5ddc639765ccf0594b7c2369bc15399ea11e63720e`。没有新增权限、依赖、版本、tag、Release 或商店变更。

## 重复执行方法与留存

在任务独立系统临时目录安装 Playwright 1.65.0，按[已有报告的 CDP 方法](2026-11-11-consistent-protected-selection.md)启动系统 Chrome，加载仓库后打开自身演示页／设置页，等待 `#HiTableStyle` attached。

- 悬停输入使用 demo-financial 的 rows[1].cells[0] 到 rows[7].cells[8]，鼠标从首格中心拖到末格中心，8 步后松手。比较悬停前后所有浮层 td 的 DOMRect、计算背景色／文字色与 outline-style。数据区第三行第四列对应浮层 rows[3].cells[4]；四边统计格取 `[0,2]`、`[8,2]`、`[2,0]`、`[2,10]`。四角按 `.HiTableAlgorithmButton[data-direction] span` 定位并悬停；每项先移出浮层再移入，等待 30ms 读取稳定状态。
- 原因排查先使用全新 profile 打开设置页，记录 themeMode=auto 与绿色 checked 同时存在；点击绿色，chrome.storage.sync.get 返回空对象。演示页拖选前读取 hovered td 的 computed background，再读选取后 `--hitable-surface`，原值分别为浅蓝与 #1f5e9d。
- 最终配置流程通过真实 radio 点击：默认 auto → green → 重载 → 修改 numberFormat → auto → 修改条件格式。读取真实 chrome.storage.sync 验证保存；固定绿色阶段分别拖选八张演示表并读取 `--hitable-surface`。标准表用 `[1,1]..[2,2]`；嵌套表用 `[1,0]..[1,3]`；罗马尼亚表用 `[1,0]..[2,0]`；CSS／ARIA Grid 取第 6 和 14 个已标记单元格（零起算）。
- 自动背景输入修改 demo-sales 所在 section.style.background 为 #10171e、#fff0f5，每次 Esc 后重新拖选取得新快照。旧配置为 `{activationMode:'manual',numberFormat:'auto',boxColor:'#2980b9',algorithm:{top:'AVG',right:'SUM',bottom:'SUM',left:'AVG'}}`。十语配置访问 `pages/config.html?locale=<locale>`，读取自动按钮 title 及帮助文本与相应 JSON 比较。

本轮执行命令形式为 `node "$HITABLE_HOVER_TEST_DIR/tools/verify-hover.cjs"` 与 `node "$HITABLE_HOVER_TEST_DIR/tools/verify-theme.cjs"`，分别得到 10/10、16/16。仅本报告进入 Git；测试脚本、profile、npm 工具／缓存、完整日志、JSON 结果及截图均在记录报告后清理。

本轮没有重复上一轮全部拖选／剪贴板／取消检查；只验证本次受影响的悬停、主题设置和颜色采样路径。不宣称解决所有网站的 CSS 背景采样、图片／渐变分析、触摸／屏幕阅读器或超大表格问题。PR 继续等待用户验收。
