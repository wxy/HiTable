# 演示背景切换、自动预览与同宽算法菜单

日期：2026-11-11。基线：`0cc5e3282a747bd8aad842893b5a717099791474`。继续更新 PR #63，不合并、不发布，版本保持 0.2.1。

## 改动与审查

| Before | After | Why |
| --- | --- | --- |
| 演示页只有一套固定底色，表格区域固定白底 | 顶部提供与 11 套主题对应的背景色系，各有浅／深模式；表格与说明同步适配 | 可以用真实拖选比较网页底色与自动浮层的关系 |
| 选项页自动主题含义不明确，背景仍沿用主题渐变 | 自动时为浅灰 #e1e1e1 底＋白色设置卡片、深色标题，新增预览说明；固定主题仍用原主题背景 | 自动预览稳定，不依赖目标网页或上次固定颜色 |
| 算法菜单固定 250px，在按钮旁边展开 | 与实际按钮同宽，左边对齐，在其下方相隔 4px 展开；空间不足时向上 | 触发位置与菜单对应，保留原单元格尺寸 |
| 原菜单间距不适合窄宽度 | 缩小内部间距，长名称换行，缩写不被挤压；按可用高度滚动 | 本地化名称和末项在窄／矮视口仍可操作 |

背景控件只改变演示页当前 DOM 的 CSS 变量，不写 chrome.storage，不改变用户的自动／固定模式。重载演示页恢复默认白底。切换背景后重新拖选，读取新的背景快照；没有为了预览修改现有选区的数据快照逻辑。默认白底，中性背景的深色模式为 #151515。

演示页背景系列不强制覆盖自动选色结果：浅棕样本为米黄，蓝灰样本饱和度较低，按原有规则选择中性石墨；其深色样本选择深色石墨。其余有色样本按原规则选择对应色系。本轮未修改自动取色算法或任一正式主题色板。

选项页 HTML 首屏默认即为自动预览色；加载已有固定设置后切换回固定背景。自动／固定的配置保存逻辑不变，记住上次固定色。十语新增背景名称、操作说明及自动预览说明，帮助与 README 同步。演示财务表中七个既有英文回退说明以及 HTML 中的旧删除线表述改为灰显，未改表格数据。

## 实际验证

环境：macOS arm64、Chrome **157.0.8103.39**、Playwright **1.65.0**。独立临时 profile，CDP Extensions.loadUnpacked 加载仓库根目录。访问真实扩展 demo/config/help 页面，使用鼠标、键盘与真实 chrome.storage.sync，无 API mock，未读取用户日常浏览器 profile。视口 1500×1100、390×800、390×400，DPR 2。

共覆盖 **54 个独立浏览器场景**。初轮 52 项中 51 项通过；“长名称应换行”的输入错误地使用了德语 STD 的既有缩写 std abw，本身不足以换行。改用真实德语 AVG 名称 durchschnitt。视觉检查后同时把名称与缩写恢复为紧凑的同排布局，复验菜单相关 **15 项全部通过**。补充浅／深矮视口滚动与末项选择，加错误收集共 **3 项通过**。选项页浅灰背景和保存重载复验 **2 项通过**；实际截图又发现旧白色标题在浅灰底不清晰，改为 #1c1c1c 深字、移除阴影后，加入标题样式断言再次定向复验 **2 项通过**。重复场景未计入 54 项总数；背景与十语检查未因局部菜单改动重复运行。

| 范围 | 实际结果 |
| --- | --- |
| 11 色系 × 浅深 | 22 组背景值、自动浮层预设及页面文字检查通过；背景操作前后 storage 完全一致。页面标题、说明及数据样本最低静态文字对比度 5.509:1，不代表完整无障碍验收。 |
| 固定主题与预览 | 固定绿色在浅蓝／深黑背景上保持绿色；固定蓝色切到自动并重载，选项页实际为 RGB(225,225,225)、background-image=none，标题为 RGB(28,28,28)、无文字阴影，静态对比度 17.04:1；仍保存上次固定蓝色。 |
| 控件操作 | 11 个原生 radio，方向键可切换，选中标记正确；390px 视口自动换行，无控件越界。深色开关同步改变页面、表格及文字，不改变保存设置。 |
| 四角菜单 | 浅／深版分别在 top/right/bottom/left 打开，共 8 项；宽度与按钮均为 104px，左边误差 <0.05px，上／下间距 4px。菜单四边在视口内，内部无横向溢出。 |
| 键盘与高亮 | ArrowDown＋Enter 选择 SUM，Esc 关闭并返回按钮焦点；角点悬停继续高亮对应统计带。打开菜单前后数据格宽高完全一致。 |
| 窄屏 | 390×800 的四个角点菜单均同宽、对齐并留在视口内。真实德语名称输入到已打开菜单进行布局检查：durchschnitt 高 39px，行高 19.5px，换为两行，无截断或横向溢出；未将此称为完整德语浏览器运行验收。 |
| 矮屏 | 390×400 浅／深菜单高 312px，底部为 392px，保留 8px 边距。内容溢出时可滚动；End 聚焦 MOD，scrollTop 分别为 93px／73px，末项可见且可提交；点击菜单外关闭。 |
| 十语与错误 | 十语实际打开背景控件、设置和帮助，核对标题、11 个色块 title、预览解释及帮助正文；无 pageerror／error 级 console。 |
| 静态检查 | demo.js、config.js、active.js、page-i18n.js 的 node --check、十语 JSON、键集合、英文新增文案回退、git diff --check 通过。 |

实际查看了浅色背景控件、浅／深菜单、390px 长名称菜单及自动配置页截图。菜单以紧凑间距维持同排名称与缩写，方向标题和长名称可换行，没有增加选区边框或改变数据格布局。

## 背景输入与重复方法

| 色系 | 浅背景 | 深背景 | 自动选择 |
| --- | --- | --- | --- |
| 中性石墨 | #ffffff | #151515 | 浅／深石墨 |
| 红 | #fff0f0 | #451b1b | 红 |
| 橙 | #fff0e5 | #4a2a17 | 橙 |
| 黄 | #fff59d | #484019 | 黄 |
| 绿 | #e8f8e8 | #183c28 | 绿 |
| 青绿 | #e2f6f0 | #123e36 | 青绿 |
| 蓝 | #e4f0ff | #19354f | 蓝 |
| 紫 | #f3e8ff | #3b184c | 紫 |
| 玫红 | #ffe8f1 | #481a2f | 玫红 |
| 棕 | #f5e6c8 | #422a1d | 浅／深石墨 |
| 蓝灰 | #e6edf0 | #263640 | 浅／深石墨 |

临时工具安装命令形式：`npm install --prefix "$HITABLE_DEMO_DIR/tools" --cache "$HITABLE_DEMO_DIR/npm-cache" --no-audit --no-fund --fetch-retries=0 playwright@1.65.0`。执行入口为 `node "$HITABLE_DEMO_DIR/tools/verify.cjs"`。针对性过滤分别为 `HITABLE_DEMO_FILTER='menu |long localized|final screenshots'`、`'short viewport|final screenshots'`、`'Automatic config preview|final screenshots'`。

Chrome 使用 launchPersistentContext：系统 executablePath，headless=true，ignoreDefaultArgs=['--disable-extensions']，args=['--enable-unsafe-extension-debugging']。通过浏览器级 CDP Extensions.loadUnpacked({path:repo}) 获取扩展 ID，再访问其 pages/demo.html?locale=en。

- 背景用真实 radio.check() 和 checkbox.setChecked()，逐一验证上表；财务表 rows[1].cells[1] 到 rows[3].cells[3] 的中心拖 8 步。读取页面实际背景与 --hitable-* 变量。配置中选择固定绿色，对浅蓝／深中性重选；固定蓝色切自动并重载，检查实际 body 样式及 storage。
- 菜单将按钮滚动到距视口顶 100／900px 的位置，点击四个方向，比较菜单及按钮的 DOMRect、屏幕边距和 scrollWidth。窄屏使用财务表 [1,1] 到 [2,1]，按钮滚至 60／700px；矮屏滚至 50px，按 End、Enter 并点击视口 (2,2) 验证关闭。
- 十语用 locale URL，比较 DOM 与消息 JSON，包括背景色块的可访问名称及原生 title。新文案静态比对英文 HTML 回退与 en JSON。已有英文灰显说明的更正仅静态核对。

只长期保留本报告。临时脚本、npm 缓存、profiles、完整日志、截图和 JSON 清理后不进入 Git。没有重复旧复制／统计、四角缩放、网格像素和网页事件的完整回归；这些逻辑本轮未改。未验证任意缩放比例、触摸／笔、完整屏幕阅读器或其他浏览器。已知财务表偶发消失仍未复现，本次不宣称修复。

限定范围审查通过，无未处理阻断项。没有改权限、依赖、主题色板、版本或原发布 ZIP，其 SHA-256 仍为 `6badcdacacd2629c0ca5fa5ddc639765ccf0594b7c2369bc15399ea11e63720e`。PR 保留，不更新 tag、Release 或商店。

## 最终运行源码 SHA-256

```text
pages/demo.html d58ab677a5f103bd18e2e19b75d686b38026bdfdda96774d0d07b44ce2a6bfb3
pages/config.html f747bdd50e559b7e8767647eb026683e99cdc9a9df2b8f5a39423852fd402050
pages/help.html 7503ede6d8ea2b9f422324946e2a2ba565d453cd188dab8a794c4b4e82cf8680
scripts/demo.js 137cafc1a1b96dc1cd45734900b8f58f32a53c35fb503161a8baa08f0e5d4513
scripts/page-i18n.js 123b9228d341f4106d9c3837e0708beac3b22192fa2113f85f799b0fa55b4c48
scripts/active.js 4f7e86907b82792e2e6d852bf780d4174b44f4274e9abef1459bc488a8cc5fbb
scripts/config.js 085452be3d677dc997e804601e35c8928b4f5f4d238391ba8e78cbb4f291241d
assets/main.css 8d7dadbc515db6f5f8d40f1ba8767925b9efa5d46856c0bc80d85a3b624f604f
```
