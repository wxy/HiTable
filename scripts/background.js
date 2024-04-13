console.log("浏览器插件已经启动，并成功加载背景脚本！");

let isActive = false;

chrome.action.onClicked.addListener((tab) => {
  isActive = !isActive;
  if (isActive) {
    // 激活扩展并修改图标
    chrome.action.setIcon({path: "../src/assets/active.png", tabId: tab.id});
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['scripts/content.js']
    });
  } else {
    // 取消扩展激活并修改图标
    chrome.action.setIcon({path: "../src/assets/logo.png", tabId: tab.id});
    // 可能需要编写一些代码来清除或逆转contentScript.js产生的效果
  }
});