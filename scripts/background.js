let activeStates = {};

chrome.action.onClicked.addListener((tab) => {
  toggleExtension(tab);
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    updateIconAndTitle(tab);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateIconAndTitle(tab);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  // 当选项卡关闭时，删除其激活状态
  delete activeStates[tabId];
});

// 更新图标和标题
function updateIconAndTitle(tab) {
  if (activeStates[tab.id]) {
    chrome.action.setIcon({path: "../src/assets/active.png", tabId: tab.id});
    chrome.action.setTitle({title: chrome.i18n.getMessage('extensionActive')});
  } else {
    chrome.action.setIcon({path: "../src/assets/inactive.png", tabId: tab.id});
    chrome.action.setTitle({title: chrome.i18n.getMessage('extensionInactive')});
  }
}

// 切换扩展程序的激活状态
function toggleExtension(tab) {
  // 获取清单文件中的 URL 匹配模式
  let manifestData = chrome.runtime.getManifest();
  let matches = manifestData.web_accessible_resources[0].matches;

  let isMatch = matches.some(pattern => {
    let regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(tab.url);
  });

  if (isMatch) {
    // 切换选项卡的激活状态
    if (activeStates[tab.id] === undefined) {
      activeStates[tab.id] = true;
    } else {
      activeStates[tab.id] = !activeStates[tab.id];
    }

    if (activeStates[tab.id]) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scripts/active.js']
      });
    } else {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scripts/inactive.js']
      });
    }
    updateIconAndTitle(tab);
  } else {
    // 如果 URL 不匹配，则将其视为非激活状态
    activeStates[tab.id] = false;
    updateIconAndTitle(tab);
  }
}