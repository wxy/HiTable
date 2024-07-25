// 选项卡的激活状态
let activeStates = {};
// 自动激活的域名
let activeDomains = {};
// 扩展的激活模式：auto | manual
let activationMode = 'manual';

// 从存储中获取配置
getStorageData(['HiTable','activeDomains']).then(result => {
  let HiTable = result.HiTable || {};
  activationMode = HiTable.activationMode || 'manual';
  activeDomains = result.activeDomains || {};
}).catch(error => {
  console.error('Error while getting storage data:', error);
});

chrome.action.onClicked.addListener((tab) => {
  toggleExtension(tab);
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    updateIconAndTitle(tab);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 当标签页加载完成
  if (changeInfo.status === 'complete' && tab.url) {
    // 如果激活模式是 'auto'，并且 URL 属于 activeDomains
    let domain = new URL(tab.url).hostname;
    if (activationMode === 'auto' && activeDomains[domain]) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['scripts/active.js']
      });
      activeStates[tabId] = true;
    } else {    
      // 清除旧 tab 的激活状态
      delete activeStates[tabId];
    }
    // 更新图标和标题
    updateIconAndTitle(tab);
  }
});

chrome.runtime.onInstalled.addListener(function() {
  let manifestData = chrome.runtime.getManifest();
  let version = manifestData.version;

  chrome.contextMenus.create({
    id: "config",
    title: chrome.i18n.getMessage('configMenu') + ' (v' + version + ')',
    contexts: ["action"],
  });
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "config") {
    chrome.tabs.create({ url: "pages/config.html" });
  }
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
  let matches = manifestData.host_permissions;

  let isMatch = matches.some(pattern => {
    let regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(tab.url);
  });

  if (! isMatch) {
    activeStates[tab.id] = false;
    updateIconAndTitle(tab);
    return;
  }

  // 切换选项卡的激活状态
  if (activeStates[tab.id] === undefined) {
    activeStates[tab.id] = true;
  } else {
    activeStates[tab.id] = !activeStates[tab.id];
  }

  // 如果激活模式是 'auto'，则更新 activeDomains
  if (activationMode === 'auto') {
    let domain = new URL(tab.url).hostname;
    if (activeStates[tab.id]) {
      activeDomains[domain] = true;
    } else {
      delete activeDomains[domain];
    }

    setStorageData({activeDomains : activeDomains}).catch(error => {
      console.error('Error while setting storage data:', error);
    });

  }
  
  // 根据激活状态执行相应的脚本
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
}

// 从 Chrome 存储中获取数据
function getStorageData(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(key, function(data) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(data);
      }
    });
  });
}

// 将数据存储到 Chrome 存储中
function setStorageData(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(data, function() {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}