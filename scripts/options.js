window.onload = function() {
  chrome.storage.sync.get('HiTable', function(data) {
    if (data.HiTable) {
      let boxColorInput = document.querySelector(`input[name="boxColor"][value="${data.HiTable.boxColor}"]`) ||
                          document.querySelector('input[name="boxColor"]:checked') ||
                          document.querySelector('input[name="boxColor"]');

      if (boxColorInput) {
        boxColorInput.checked = true;
      }
      document.getElementById('top').value = data.HiTable.algorithm.top;
      document.getElementById('right').value = data.HiTable.algorithm.right;
      document.getElementById('bottom').value = data.HiTable.algorithm.bottom;
      document.getElementById('left').value = data.HiTable.algorithm.left;
    }
  });
  function saveOptions(event) {
    event.preventDefault();

    var boxColorInput = document.querySelector('input[name="boxColor"]:checked');
    var boxColor = boxColorInput ? boxColorInput.value : '#27ae60';
    var top = document.getElementById('top').value;
    var right = document.getElementById('right').value;
    var bottom = document.getElementById('bottom').value;
    var left = document.getElementById('left').value;

    // Get more options here

    var options = { 
        boxColor: boxColor, 
        algorithm: {
            top: top, right: right, bottom: bottom, left: left 
        }
    };
    chrome.storage.sync.set({HiTable: options}, function() {
      submitButton.value = chrome.i18n.getMessage('optionsSaved');
    });
  }

  // 修改配置
  var form = document.getElementById('optionsForm');
  var submitButton = form.querySelector('input[type="submit"]');
  form.addEventListener('change', saveOptions);
  submitButton.addEventListener('click', saveOptions);

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