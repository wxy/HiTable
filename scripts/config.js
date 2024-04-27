window.onload = function() {
  // 默认配置
  let defaultConfig = {
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
  function saveConfig(event) {
    event.preventDefault();

    var boxColorInput = document.querySelector('input[name="boxColor"]:checked');
    var boxColor = boxColorInput ? boxColorInput.value : '#27ae60';
    var top = document.getElementById('top').value;
    var right = document.getElementById('right').value;
    var bottom = document.getElementById('bottom').value;
    var left = document.getElementById('left').value;

    var config = { 
        boxColor: boxColor, 
        algorithm: {
            top: top, right: right, bottom: bottom, left: left 
        }
    };
    chrome.storage.sync.set({HiTable: config}, function() {
      submitButton.value = chrome.i18n.getMessage('configSaved');
    });
  }

  // 修改配置
  var form = document.getElementById('configForm');
  var submitButton = form.querySelector('input[type="submit"]');
  form.addEventListener('change', saveConfig);
  submitButton.addEventListener('click', saveConfig);

  // 国际化
  var elements = document.querySelectorAll('[data-i18n]');

  for (var i = 0; i < elements.length; i++) {
    var messageName = elements[i].getAttribute('data-i18n');
    var message = chrome.i18n.getMessage(messageName);

    if (message) {
      switch (elements[i].tagName) {
        case 'INPUT':
          if (['submit', 'button'].includes(elements[i].type)) {
            elements[i].value = message;
          } else {
            elements[i].placeholder = message;
          }
          break;
        case 'IMG':
          elements[i].alt = message;
          break;
        default:
          elements[i].textContent = message;
          break;
      }
    } 
  }
};