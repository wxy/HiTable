// 选项卡的激活状态
let activeTabs = {};
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
    // 检查 tab 是否有效
    if (chrome.runtime.lastError) {
      // 标签页可能已关闭，忽略错误
      return;
    }
    if (tab) {
      handleTabActivation(tab);
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  handleTabUpdate(tab);
});

chrome.runtime.onInstalled.addListener(function() {
  // 设置默认图标
  chrome.action.setIcon({path: "../assets/inactive.png"});
  let manifestData = chrome.runtime.getManifest();
  let version = manifestData.version;
  // 创建右键菜单
  chrome.contextMenus.create({
    id: "report",
    title: chrome.i18n.getMessage('reportMenu'),
    contexts: ["action"],
  });
  chrome.contextMenus.create({
    id: "help",
    title: chrome.i18n.getMessage('helpMenu') + ' (v' + version + ')',
    contexts: ["action"],
  });
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "report") {
    let issueTitle = encodeURIComponent("[BUG] URL Report");
    let issueBody = encodeURIComponent("- URL: " + tab.url + "\n"
      + "- Browser: " + navigator.userAgent + "\n"
      + "- Version: " + chrome.runtime.getManifest().version + "\n"
      + "- Language: " + chrome.i18n.getUILanguage() + "\n"
      + "- Description: \n\nOr attach a screenshot here.");
    let url = `https://github.com/wxy/HiTable/issues/new?title=${issueTitle}&body=${issueBody}`;
    chrome.tabs.create({ url: url });
  } else if (info.menuItemId === "help") {
    let locale = chrome.i18n.getUILanguage().replace('-', '_');
    if (!locale.startsWith('zh')) {
      locale = locale.split('_')[0];
    }
    let locales = ['de', 'en', 'hi', 'ja', 'ko', 'ru', 'zh_CN', 'zh_HK', 'zh_TW'];
    if (!locales.includes(locale)) {
      chrome.tabs.create({ url: "https://github.com/wxy/HiTable/blob/master/README.md"});      
    } else {
      chrome.tabs.create({ url: `https://github.com/wxy/HiTable/blob/master/docs/README-${locale}.md`});
    }
  }
});

// 更新图标和标题
function updateIconAndTitle(tab) {
  if (activeTabs[tab.id]) {
    chrome.action.setIcon({path: "../assets/active.png", tabId: tab.id});
    chrome.action.setTitle({title: chrome.i18n.getMessage('extensionActive')});
  } else {
    chrome.action.setIcon({path: "../assets/inactive.png", tabId: tab.id});
    chrome.action.setTitle({title: chrome.i18n.getMessage('extensionInactive')});
  }
}

// 判断 URL 是否匹配清单文件中的模式
function isValidUrl(tab) {
  try {
    if (tab && tab.url) {
      // 获取清单文件中的 URL 匹配模式
      let manifestData = chrome.runtime.getManifest();
      let matches = manifestData.host_permissions;

      return matches.some(pattern => {
        let regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(tab.url);
      });
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error in isValidUrl:', error);
    return false;
  }
}

// 切换扩展程序的激活状态
function toggleExtension(tab) {
  if (!isValidUrl(tab)) {
    delete activeTabs[tab.id];
    return updateIconAndTitle(tab);
  }

  // 切换选项卡的激活状态
  if (activeTabs[tab.id] === undefined) {
    activeTabs[tab.id] = true;
  } else {
    activeTabs[tab.id] = !activeTabs[tab.id];
  }

  // 如果激活模式是 'auto'，则更新 activeDomains
  if (activationMode === 'auto') {
    let domain = new URL(tab.url).hostname;
    if (activeTabs[tab.id]) {
      activeDomains[domain] = true;
    } else {
      delete activeDomains[domain];
    }

    setStorageData({activeDomains : activeDomains}).catch(error => {
      console.error('Error while setting storage data:', error);
    });
  }
  
  // 根据激活状态执行相应的脚本
  if (activeTabs[tab.id]) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['scripts/logic-table.js', 'scripts/active.js']
    });
  } else {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['scripts/inactive.js']
    });
  }
  updateIconAndTitle(tab);
}

// 处理标签页激活事件
function handleTabActivation(tab) {
  if (!isValidUrl(tab)) {
    delete activeTabs[tab.id];
    return updateIconAndTitle(tab);
  }

  if (tab.url) {
    // 如果激活模式是 'auto'，并且 URL 属于 activeDomains
    let domain = new URL(tab.url).hostname;
    let activation = activeTabs[tab.id];
    if (activationMode === 'auto') {
      activeTabs[tab.id] = activeDomains[domain] ? true : false;
    }
    // 如果激活状态发生变化，根据激活状态执行相应的脚本
    if (activeTabs[tab.id] !== activation) {
      if (activeTabs[tab.id]) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['scripts/logic-table.js', 'scripts/active.js']
        });
      } else {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['scripts/inactive.js']
        });
      }
    }
    // 更新图标和标题
    updateIconAndTitle(tab);
  }
}

// 处理标签页更新事件
function handleTabUpdate(tab) {
  if (!isValidUrl(tab)) {
    delete activeTabs[tab.id];
    return updateIconAndTitle(tab);
  }

  // 当标签页加载完成
  if (tab.status === 'complete' && tab.url) {
    // 如果激活模式是 'auto'，并且 URL 属于 activeDomains
    let domain = new URL(tab.url).hostname;
    if (activationMode === 'auto') {
      activeTabs[tab.id] = activeDomains[domain] ? true : false;
    }
    // 根据激活状态执行相应的脚本
    if (activeTabs[tab.id]) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scripts/logic-table.js', 'scripts/active.js']
      });
    }
    // 更新图标和标题
    updateIconAndTitle(tab);
  }
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