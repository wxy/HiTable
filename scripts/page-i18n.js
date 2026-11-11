/**
 * Demo 页面国际化加载
 * 加载对应语言的消息文件，替换页面中所有 [data-i18n] 元素的文本
 */
(function() {
  var urlParams = new URLSearchParams(window.location.search);
  var locale = urlParams.get('locale') || chrome.i18n.getUILanguage() || navigator.language;
  locale = locale.replace(/-/g, '_');

  var available = ['de', 'en', 'hi', 'ja', 'ko', 'ro', 'ru', 'zh_CN', 'zh_HK', 'zh_TW'];
  if (!available.includes(locale)) {
    var lang = locale.split('_')[0];
    var match = available.find(function(l) { return l.startsWith(lang); });
    locale = match || 'en';
  }
  document.documentElement.lang = locale.replace('_', '-');

  // The demo overlay waits for the same catalog as the page. Ordinary web
  // pages do not load this script and keep using Chrome's native messages.
  window.HiTablePageI18n = fetch('../_locales/' + locale + '/messages.json')
    .then(function(response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(function(messages) {
      function getMessage(key, substitutions = []) {
        var message = messages[key];
        if (!message) return chrome.i18n.getMessage(key, substitutions);
        var values = Array.isArray(substitutions) ? substitutions : [substitutions];
        // Our catalogs use numbered $1$ ... $4$ placeholders.
        return message.message.replace(/\$(\d)\$/g, function(_, index) {
          return values[Number(index) - 1] ?? '';
        });
      }
      var elements = document.querySelectorAll('[data-i18n]');
      for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        var key = el.getAttribute('data-i18n');
        var msg = messages[key];
        if (!msg || !msg.message) continue;
        var text = getMessage(key);
        if (el.classList.contains('demo-background-option')) el.title = text;
        var tag = el.tagName;
        if (tag === 'IMG') {
          el.alt = text;
        } else if (tag === 'INPUT') {
          if (el.type === 'submit' || el.type === 'button') {
            el.value = text;
          } else {
            el.placeholder = text;
          }
        } else {
          el.textContent = text;
        }
      }
      return getMessage;
    })
    .catch(function(err) {
      // 静默失败 — 页面仍可用，只是英文原文
      return chrome.i18n.getMessage.bind(chrome.i18n);
    });

  // 帮助链接（相对于页面点击时打开本地帮助页）
  var helpLink = document.getElementById('demoHelpLink');
  if (helpLink) {
    helpLink.href = chrome.runtime.getURL('pages/help.html') + '?locale=' + locale;
    helpLink.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: helpLink.href });
    });
  }

  // 设置版本号（帮助页使用）
  var versionEl = document.getElementById('version');
  if (versionEl) {
    versionEl.textContent = chrome.runtime.getManifest().version;
  }
})();
