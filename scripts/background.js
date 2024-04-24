let isActive = false;

chrome.action.onClicked.addListener((tab) => {
  // Check if the URL starts with "chrome://"
  if (tab.url.startsWith("chrome://")) {
    return; // Don't activate the extension
  }

  isActive = !isActive;
  if (isActive) {
    // 激活扩展并修改图标
    chrome.action.setIcon({path: "../src/assets/active.png", tabId: tab.id});
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['scripts/active.js']
    });
  } else {
    // 取消扩展激活并修改图标
    chrome.action.setIcon({path: "../src/assets/inactive.png", tabId: tab.id});
    // 可能需要编写一些代码来清除或逆转contentScript.js产生的效果
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['scripts/inactive.js']
    });
  }
});

chrome.runtime.onInstalled.addListener(function() {
  // 设置默认图标
  chrome.action.setIcon({path: "../src/assets/inactive.png"});

  chrome.contextMenus.create({
    id: "options",
    title: chrome.i18n.getMessage('optionsMenuTitle'),
    contexts: ["action"],
  });
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "options") {
    chrome.tabs.create({ url: "pages/options.html" });
  }
});