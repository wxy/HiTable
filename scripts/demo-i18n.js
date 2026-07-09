/**
 * Demo 页面国际化加载
 * 加载对应语言的消息文件，替换页面中所有 [data-i18n] 元素的文本
 */
(function() {
  var urlParams = new URLSearchParams(window.location.search);
  var locale = urlParams.get('locale');
  if (!locale) {
    locale = (chrome.i18n && chrome.i18n.getUILanguage()) || navigator.language;
    locale = locale.replace('-', '_');
  }

  var available = ['de', 'en', 'hi', 'ja', 'ko', 'ru', 'zh_CN', 'zh_HK', 'zh_TW'];
  if (!available.includes(locale)) {
    var lang = locale.split('_')[0];
    var match = available.find(function(l) { return l.startsWith(lang); });
    locale = match || 'en';
  }

  fetch('../_locales/' + locale + '/messages.json')
    .then(function(response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(function(messages) {
      var elements = document.querySelectorAll('[data-i18n]');
      for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        var key = el.getAttribute('data-i18n');
        var msg = messages[key];
        if (!msg || !msg.message) continue;
        var text = msg.message;
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
    })
    .catch(function(err) {
      // 静默失败 — 页面仍可用，只是英文原文
    });
})();
