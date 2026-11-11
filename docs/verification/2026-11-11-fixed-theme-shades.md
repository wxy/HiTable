# 固定色系明暗适配与实时样式更新

日期：2026-11-11。基线：`063c7eecd80a9451f79222b8c35ffc8472fa4561`。更新 PR #63，不合并、不发布，版本保持 0.2.1。

## 行为与实现审查

| Before | After | Why |
| --- | --- | --- |
| 固定主题整套色板不变，只有自动中性石墨有深色版 | 11 个色系均有设计好的浅／深配色，固定模式保留色系，明暗跟随网页 | 保留用户偏好，同时适配深色页面 |
| 背景与数据一起存在选择快照中 | 数据／几何保持快照，外观读取实时网页底色 | 明暗变化不重建选区、不重读数据 |
| 系统切换后要重新拖选才更新外观 | 监听媒体偏好 change、html/body 属性变化和背景 transitionend | 支持运行中的系统与网页主题切换 |
| 深色菜单焦点沿用较暗主色 | 深色菜单焦点使用该色系的亮高亮色，浏览器原生 UI 限定在扩展元素内切换明暗 | 保持焦点可见，不改变宿主网页 color-scheme |

自动模式仍按原规则选择色系；固定模式使用已保存的色系键。两者再用网页背景的相对亮度（<0.18 为深色）选择色板。网页明确的白底／黑底优先；透明画布沿用网页声明的 color-scheme 与系统偏好。颜色均为静态预设，没有 RGB 反色或运行时生成新色板。

保留全部 11 套原浅色配色及保存键，深色石墨的主要配色也保留。公共灰显、菜单和网格样式按明暗使用现有中性色。设置页继续预览浅色配色，自动预览仍为浅灰底＋白色卡片，没有新增保存字段或版本迁移。十语设置、帮助、演示说明和 README 同步为“固定色系，明暗适配”。

实时变化只更新 #HiTableStyle 的变量：不调用 showOverlay、calculation 或 captureTableSnapshot。MutationObserver 仅观察 html 和 body 自身属性，不观察子树；连续变化合并到一次 requestAnimationFrame，相同 CSS 不重复写入。背景渐变按已有规则取代表色，背景色过渡结束后再读取终态。停用时移除媒体监听、断开 observer 并取消待执行帧。

按 modern-web-guidance 的 dark-mode/color 指引补上运行中的 change 监听、使用预设配色并核对文字与焦点对比。color-scheme 只设置在扩展浮层、菜单、Toast 和手柄容器上；不向宿主 html 或 meta 注入全局明暗策略，以免改变网页原生控件和背景。

## 深色配色

统计区文字均为 #ffffff；浅色版与基线逐字段完全一致。

| 色系 | 数据背景／文字 | 统计背景 | 高亮背景／文字 |
| --- | --- | --- | --- |
| 石墨 | #303030 / #f3f3f3 | #686868 | #e1e1e1 / #242424 |
| 红 | #3d2524 / #ffe9e6 | #8f382f | #f2aaa0 / #321b19 |
| 橙 | #3c2a20 / #ffeadb | #92501f | #f1b47d / #302116 |
| 黄 | #34301f / #fff2c9 | #80631f | #f0d181 / #302819 |
| 绿 | #20372b / #e3f6e9 | #286547 | #93d7ad / #142a1e |
| 青绿 | #1d3530 / #dff6f0 | #22675a | #8bd7c5 / #122c25 |
| 蓝 | #22323e / #e2f1fc | #2d6085 | #93c6e9 / #172a38 |
| 紫 | #322638 / #f2e5fa | #70448a | #ceb0e1 / #291b32 |
| 玫红 | #3b2430 / #ffe4ef | #90385e | #eda4c1 / #321b26 |
| 棕 | #352a25 / #f5e9df | #795846 | #cdb09d / #2e221b |
| 蓝灰 | #29333a / #e5f0f5 | #526976 | #b0c6d1 / #202c34 |

## 实际验证

环境：macOS arm64，Chrome **157.0.8103.39**，Playwright **1.65.0**；独立临时 profile，CDP Extensions.loadUnpacked 加载仓库根目录。视口 1500×1100，DPR 2。验证真实扩展 demo/config/help 页面及通过工具栏激活的普通 HTTP 页面，真实鼠标、键盘、存储及剪贴板，无 Chrome API mock，未读取用户日常 profile。

覆盖 **40 个独立场景**。初轮 32 项通过，8 项因测试断言及其连带状态失败：打开算法菜单时，其对应统计带合法地处于高亮状态，但通用断言仍要求普通统计色；测试在错误退出前留下菜单及主题属性，又影响了后续输入。断言改为根据实际高亮属性核对相应配色，并给验证流程增加遇错停止。仅重跑后半段及受状态影响的 **24 项，全部通过**；前 16 项保留原通过结果。产品代码未因这些断言错误再次修改。另补“先修改源表再复制”的明确前置条件，复制／错误收集 **2 项通过**。重复次数不计入独立场景总数。

| 范围 | 实际结果 |
| --- | --- |
| 11 固定色系 | 逐套浅→深→浅切换通过；数据／统计／高亮配色均匹配预设，非数值保持灰显。色系键与完整保存配置不变。 |
| 22 套配色 | 66 组主要文字配对最低 **4.8036:1**；33 组深色配对最低 **5.5723:1**。深色菜单当前项最低约 13.44:1，焦点轮廓对其实际背景最低 **7.4037:1**。只确认这些静态配色，不代表完整无障碍验收。 |
| 选区稳定 | 11 套切换前后为同一个 overlay DOM 节点，文字、行列数及每格 DOMRect 完全相同；不重建浮层。键盘切演示页深色开关也保留选区。 |
| 自动模式 | 不重选时从白底变深蓝底，选择深蓝色板；再变浅红底，选择浅红色板。选区节点、文字和几何不变。 |
| 系统偏好 | 普通网页使用真实 prefers-color-scheme 媒体查询，emulateMedia 亮→暗→亮，固定绿色保持色系并自动切换明暗。源表 A-100/49 改为 CHANGED/999 后，浮层文字及统计仍为原快照。 |
| 菜单／Toast | 菜单打开时变暗，菜单焦点、宽高及位置保持；示例为 104×404.5px。真实复制后 Toast 随配色更新，摘要文字不变。 |
| 复制快照 | 单独通过场景中先将源表 A-100/49 改为 CHANGED/999，再真实复制，仍得到 `A-100\t49\t12000\nB-200\t29\t9800\n`。 |
| 网页主题入口 | html 的 data 属性／class、body 的 class／style 均能触发更新；120ms 的 background-color 过渡结束后进入正确终态，正反方向均通过。 |
| 优先级与透明画布 | 系统暗色＋明确白底仍用浅色；系统亮色＋明确黑底用深色。透明背景、root color-scheme:light dark 时跟随系统明暗。 |
| 宿主与观察范围 | 宿主 root 声明 light、页面黑底时，扩展菜单为 dark，宿主仍为 light。插入 20 个子节点和无关 body 属性变化后，相同主题样式写入次数为 **0**。 |
| 缩放与快照 | 明暗切换后用 SE 手柄方向键扩展选区，源表下一行价格虽改为 888，新增区域仍显示原快照 29，配色继续为深绿。 |
| 停用／重启 | 真实工具栏停用后改变系统偏好和根属性，样式和浮层不再出现；再次激活后工作正常，样式节点只有一个。 |
| 旧设置／十语 | 旧石墨键 #746b5e、棕色键 #5d4037 在无 themeMode 的设置中仍选原色系，并支持深色；十语设置、演示和帮助实际文本匹配。 |
| 错误／静态 | 无 pageerror／error 级 console。JS 语法、JSON、diff、英文 HTML 回退通过；十语仅修改 themeFixed/themeHelp/helpThemeSelection/demoBackgroundHelp，键集合不变。 |

实际查看了深绿、深黄浮层截图：三级配色、白色统计文字、灰显、薄网格和四角手柄保持平面风格。没有新增动画，也没有改变格子尺寸或手柄定位。

## 重复执行与留存

工具、profile、HTTP 输入、截图、日志和 JSON 均放系统独立临时目录。安装命令形式：`npm install --prefix "$HITABLE_SHADE_DIR/tools" --cache "$HITABLE_SHADE_DIR/npm-cache" --no-audit --no-fund --fetch-retries=0 playwright@1.65.0`。主入口为 `node "$HITABLE_SHADE_DIR/tools/verify.cjs"`；后半段过滤为 `HITABLE_SHADE_FILTER='live menu|copy and toast|html data|background transition|body style|explicit white|transparent CSS|native menu|source subtree|resize after|deactivation|legacy saved|localization|no page errors'`，复制补强使用 `'copy and toast|no page errors'`。

Chrome 使用系统 executablePath、headless=true、ignoreDefaultArgs=['--disable-extensions']、args=['--enable-unsafe-extension-debugging']。普通页通过浏览器级 CDP Extensions.triggerAction({id,targetId}) 激活／停用，未直接调用被测事件函数。

- 演示财务表：rows[1].cells[0] 到 rows[2].cells[2]，中心拖 8 步，移出清除悬停。真实配置 radio 逐一保存 11 色系；通过根 CSS 变量和 data-demo-scheme 切换白／#151515 背景，比较同一个浮层节点、文字、行列及每格坐标。悬停数值格、打开顶部算法菜单，读取实际背景／文字／焦点颜色。
- 普通页输入：本地临时 HTTP 服务输出固定表格（SKU、Price、Units；A-100/49/12000，B-200/29/9800，C-300/89/22000），body 的媒体查询在 #fff 与 #151515 间变化；html data-shade=dark 和 dark-class、body test-body-dark 提供同样底色。背景动画使用 transition:background-color 0.12s linear。用 emulateMedia 改偏好，或改真实根属性／style；所有数据断言都针对真实浮层和剪贴板。
- 数据变化在选区创建后执行；只检查旧快照仍显示、统计和复制。缩放输入先选第一行三列，修改第二行 Price 为 888，再暗化背景，聚焦 SE 按 ArrowDown，验证仍显示 29。
- 生命周期：在同一普通页真实停用，改变偏好及根属性，等待两帧确认样式不复活；重新激活并拖选。十语使用 locale URL 并核对各自 JSON，固定主题保存兼容检查使用真实 chrome.storage.sync。

只保留本报告；测试脚本、临时工具、缓存、profiles、截图、日志、JSON 和临时指引文件记录后清理，不进入 Git。没有重复所有旧菜单窄屏、网格像素、复制拒绝和网页事件回归；布局及这些控制流程本轮未改。未做跨浏览器、任意缩放比例、触摸／笔、完整屏幕阅读器或强制高对比模式验收。静态配色不包含既有异常脉冲中间帧。

现有背景识别仍以 html/body CSS 底色和可读取的渐变为准，不分析背景图片、视频、全屏子容器或任意 CSS 动画。未改根属性／媒体偏好而仅替换样式表的网页主题切换不在本轮实时监听范围，新拖选仍读取当时底色。财务表偶发松手消失仍未复现，本次不宣称修复。

限定范围审查通过，无未处理阻断项。manifest、package.json、background.js、inactive.js、config.js、demo.js 及原发布 ZIP 未改，无新增权限、依赖、版本或存储字段。ZIP SHA-256 仍为 `6badcdacacd2629c0ca5fa5ddc639765ccf0594b7c2369bc15399ea11e63720e`。保持 PR 未合并，不发布或更新 tag／Release／商店。

## 最终运行源码 SHA-256

```text
scripts/active.js bca652b27a36e16ddd36feb563199399237233f5b5d9dd01e872da116290caf4
scripts/themes.js 472c18e98f267fc4a415ca7d34d1f2fafd9fb9b4d2969d3a39d444ab4e4748ca
assets/main.css c0e0747f3ae4242b941b775335552d007fd165aceb4e865be131411041c9e73b
pages/config.html 304199094cba31887423a9a5496c2b42cf31ca1d04d5552a16771eaf124932ce
pages/demo.html da9afa72d49181b65c80d86843abc7a48c77f6183ba7f585b302489bd0533fec
pages/help.html af43f753c05f25acace12423035d207441d11b26f41707e05e78c87334ea8611
```
