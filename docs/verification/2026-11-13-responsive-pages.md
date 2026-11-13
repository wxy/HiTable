# 内置页面窄屏适配验证

日期：2026-11-13。将旧分支唯一未合入的提交 `37d61f12d34e3bfd24cc3a0f751370dfb839a9f6` 与 master `82a5e8dad47592001dedd961ba348b604bdfd0cc` 组合。`git merge-tree --write-tree --messages master feature/statistics-enhancement` 返回成功，三个页面均自动合并，无 Git 冲突。

## 范围

- 保留旧提交对 config/demo/help 的 600px、640px 媒体查询：调整网格、留白、字号及演示步骤排列。
- 视觉检查发现，设置页从三列改为两列后，原 DOM 顺序使左右算法的提示文字与控件错配。仅补三条 CSS 声明：数据区固定第三行，左右提示分别固定第四行、第二行的第二列，保持四组控件与其实际作用方向一致。
- 相对 master 的产品源码改动仅为三个页面的 54 行 CSS。没有改 JavaScript、权限、版本、统计算法或数据结构。

## 环境、命令与结果

macOS arm64、Google Chrome 157.0.8103.52、bundled Playwright。独立临时 Chrome profile，通过 Extensions.loadUnpacked 加载真实扩展，直接打开 `chrome-extension://<id>/pages/config.html?locale=en`、demo.html、help.html。

共七个页面/宽度组合完成检查：

| 页面 | 视口 | 实际结果 |
| --- | --- | --- |
| config | 390×900 | 两列各161px；数据区跨两列，四组算法控件与提示的顶部坐标差小于2px；标题22px；页面无水平溢出。 |
| config | 620×900 | 保留三列网格，采用640px内紧凑边距和22px标题；无页面水平溢出。 |
| config | 1280×900 | 保留桌面三列、28px标题；无页面水平溢出。 |
| demo | 390×900 | 操作步骤纵向排列，24px标题；页面宽度390px，宽表格保留原有容器行为。 |
| demo | 1280×900 | 操作步骤横向排列，32px标题；桌面布局保留。 |
| help | 390×900 | 标题20px，章节留白缩小；页面宽度390px。 |
| help | 1280×900 | 保留原有24px标题，页面宽度1280px。 |

实际查看了390px下的设置网格、演示页与帮助页截图，确认控件/提示配对及文本排列。没有页面未捕获异常。初始尺寸断言漏算既有数据格 margin，桌面帮助标题预期也误写为28px；按实际盒模型和主分支24px定义校正。最终六项一次通过，帮助页1280px定点复验通过，未为通过断言修改产品尺寸。

静态检查：`git diff --check master...HEAD` 通过；差异核对为旧51行CSS及已说明的三行配对修正。仅布局样式变更，因此未执行构建、复制回归或其他无关模块。

重复方法：在系统临时目录准备 Playwright 脚本，用 `chromium.launchPersistentContext(TEST_DIR + '/profile', {channel:'chrome', headless:false, ignoreDefaultArgs:['--disable-extensions'], args:['--enable-unsafe-extension-debugging']})` 启动；加载工作区扩展后，按表中视口调用 page.setViewportSize，导航三个真实扩展页面。配置页等待算法 select 的 options.length > 1，再读取 getComputedStyle、getBoundingClientRect 和 documentElement.scrollWidth。390px时检查四组 id：cornerLeftTop/edgeTop、cornerRightTop/edgeRight、cornerLeftBottom/edgeLeft、cornerRightBottom/edgeBottom，配对顶部差小于2px。

本次命令：`node "$HITABLE_RESPONSIVE_TEST_DIR/verify.cjs"`；最终单项复验：`CASE_FILTER=help-1280 node "$HITABLE_RESPONSIVE_TEST_DIR/verify.cjs"`。截图、脚本、JSON、Chrome profile 和 npm 缓存均为临时过程文件，报告记录后删除，只有本报告入库。

未验收真实手机/触摸、多语言长文案、系统文字缩放或所有屏幕宽度。现代 Web 指导仅用于核对响应式范围与级联，没有借合入旧提交改造为容器查询、设计系统或其他结构重构。
