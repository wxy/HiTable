window.onload = function() {
  // 默认配置
  let defaultConfig = {
    activationMode: 'manual',
    boxColor: '#27ae60',
    algorithm: {
      top: 'AVG',
      right: 'SUM',
      bottom: 'SUM',
      left: 'AVG'
    }
  };
  chrome.storage.sync.get('HiTable', function(data) {
    let config = data.HiTable || defaultConfig;
    let activationModeInput = document.querySelector(`input[name="activationMode"][value="${config.activationMode}"]`) ||
                              document.querySelector('input[name="activationMode"]:checked') ||
                              document.querySelector('input[name="activationMode"]');
    if (activationModeInput) {
      activationModeInput.checked = true;
    }

    let boxColorInput = document.querySelector(`input[name="boxColor"][value="${config.boxColor}"]`) ||
                        document.querySelector('input[name="boxColor"]:checked') ||
                        document.querySelector('input[name="boxColor"]');
    if (boxColorInput) {
      boxColorInput.checked = true;
    }
    document.getElementById('top').value = config.algorithm.top;
    document.getElementById('right').value = config.algorithm.right;
    document.getElementById('bottom').value = config.algorithm.bottom;
    document.getElementById('left').value = config.algorithm.left;
  });
 
  // 修改配置
  var form = document.getElementById('configForm');
  var submitButton = form.querySelector('input[type="submit"]');
  form.addEventListener('change', saveConfig);
  submitButton.addEventListener('click', saveConfig);

  // 根据浏览器设置评价链接
  const link = document.querySelector('a[data-i18n="configReview"]');
  const userAgent = window.navigator.userAgent;
  if (userAgent.indexOf("Edg") > -1) {
    link.href = "https://microsoftedge.microsoft.com/addons/detail/jnmhigemkohjhkdjcabafbfffmlgbodi";
  } else if (userAgent.indexOf("Chrome") > -1) {
    link.href = "https://chromewebstore.google.com/detail/gepfjnfkjimhdfemijfnnpefdpocldpc/reviews";
  }

  // 获取 URL 查询参数
  let urlParams = new URLSearchParams(window.location.search);
  let locale = urlParams.get('locale')?.replace('-', '_');

  // 国际化
  var elements = document.querySelectorAll('[data-i18n]');

  if (locale) {
    // 如果 locale 参数存在，加载相应语言的 messages.json 文件
    fetch(`../_locales/${locale}/messages.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(messages => {
        // 使用 messages.json 文件来设置元素的内容
        for (let i = 0; i < elements.length; i++) {
          let messageName = elements[i].getAttribute('data-i18n');
          if (!messages[messageName]) {
            console.error(`Message ${messageName} not found in ${locale}/messages.json`);
          }
          let message = messages[messageName]?.message || "";
          if (message) {
            setElementContent(elements[i], message);
          }
        }
      });
  } else {
    // 否则，使用 chrome.i18n API
    for (let i = 0; i < elements.length; i++) {
      let messageName = elements[i].getAttribute('data-i18n');
      let message = chrome.i18n.getMessage(messageName);
      if (message) {
        setElementContent(elements[i], message);
      }
    }
  }

  function setElementContent(element, message) {
    switch (element.tagName) {
      case 'INPUT':
        if (['submit', 'button'].includes(element.type)) {
          element.value = message;
        } else {
          element.placeholder = message;
        }
        break;
      case 'IMG':
        element.alt = message;
        break;
      default:
        element.textContent = message;
        break;
    }
  }

  function saveConfig(event) {
    event.preventDefault();

    var activationModeInput = document.querySelector('input[name="activationMode"]:checked');
    var activationMode = activationModeInput ? activationModeInput.value : 'manual';
    var boxColorInput = document.querySelector('input[name="boxColor"]:checked');
    var boxColor = boxColorInput ? boxColorInput.value : '#27ae60';
    var top = document.getElementById('top').value;
    var right = document.getElementById('right').value;
    var bottom = document.getElementById('bottom').value;
    var left = document.getElementById('left').value;

    var config = {
        activationMode: activationMode, 
        boxColor: boxColor, 
        algorithm: {
            top: top, right: right, bottom: bottom, left: left 
        }
    };
    chrome.storage.sync.set({HiTable: config}, function() {
      submitButton.value = chrome.i18n.getMessage('configSaved');
    });
  }
};