window.onload = function() {
  // 默认配置
  const DEFAULT_ENABLED_ALGORITHMS = ['CNT', 'SUM', 'AVG', 'MIN', 'MAX', 'RNG', 'MED', 'STD', 'VAR', 'MOD'];
  let defaultConfig = {
    activationMode: 'manual',
    boxColor: '#27ae60',
    algorithm: {
      top: 'AVG',
      right: 'SUM',
      bottom: 'SUM',
      left: 'AVG'
    },
    enabledAlgorithms: DEFAULT_ENABLED_ALGORITHMS
  };
  
  // 颜色映射表（主色 -> 深色）
  const colorVariants = {
    '#c0392b': { light: '#e74c3c', dark: '#922b21' },
    '#d35400': { light: '#e67e22', dark: '#a04000' },
    '#f39c12': { light: '#f1c40f', dark: '#b9770e' },
    '#27ae60': { light: '#2ecc71', dark: '#1e8449' },
    '#16a085': { light: '#1abc9c', dark: '#117864' },
    '#2980b9': { light: '#3498db', dark: '#1f618d' },
    '#8e44ad': { light: '#9b59b6', dark: '#6c3483' },
    '#c2185b': { light: '#e91e63', dark: '#880e4f' },
    '#5d4037': { light: '#795548', dark: '#3e2723' },
    '#607d8b': { light: '#78909c', dark: '#37474f' }
  };
  
  // 角落到边缘的映射关系
  const cornerToEdge = {
    leftTop: 'top',
    rightTop: 'right',
    leftBottom: 'left',
    rightBottom: 'bottom'
  };
  
  // 更新主题色
  function updateThemeColor(color) {
    const variants = colorVariants[color] || { light: color, dark: color };
    document.documentElement.style.setProperty('--theme-color', color);
    document.documentElement.style.setProperty('--theme-color-light', variants.light);
    document.documentElement.style.setProperty('--theme-color-dark', variants.dark);
  }
  
  // 显示保存状态
  let saveTimeout;
  function showSaveStatus() {
    const status = document.getElementById('saveStatus');
    if (status) {
      status.classList.add('show');
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        status.classList.remove('show');
      }, 1500);
    }
  }
  
  chrome.storage.sync.get('HiTable', function(data) {
    let config = data.HiTable || defaultConfig;
    // 确保 enabledAlgorithms 存在
    config.enabledAlgorithms = config.enabledAlgorithms || DEFAULT_ENABLED_ALGORITHMS;
    
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
    
    // 应用主题色
    updateThemeColor(config.boxColor);
    
    // 加载算法选择
    loadEnabledAlgorithms(config.enabledAlgorithms);
    
    // 根据启用的算法更新下拉选项
    updateAlgorithmSelects(config.enabledAlgorithms);
    
    // 设置角落选择器的值（通过边缘映射）
    document.getElementById('leftTop').value = config.algorithm.top;
    document.getElementById('rightTop').value = config.algorithm.right;
    document.getElementById('leftBottom').value = config.algorithm.left;
    document.getElementById('rightBottom').value = config.algorithm.bottom;
    
    // 更新边缘显示
    updateEdgeDisplays();
  });
  
  // 更新边缘显示的算法名称
  function updateEdgeDisplays() {
    const displays = {
      topAlgoDisplay: document.getElementById('leftTop')?.value || 'SUM',
      rightAlgoDisplay: document.getElementById('rightTop')?.value || 'SUM',
      leftAlgoDisplay: document.getElementById('leftBottom')?.value || 'SUM',
      bottomAlgoDisplay: document.getElementById('rightBottom')?.value || 'SUM'
    };
    
    Object.entries(displays).forEach(([displayId, algo]) => {
      const display = document.getElementById(displayId);
      if (display) {
        display.textContent = algo;
      }
    });
  }

  // 加载启用的算法复选框
  function loadEnabledAlgorithms(enabledAlgorithms) {
    document.querySelectorAll('input[name="enabledAlgorithms"]').forEach(checkbox => {
      checkbox.checked = enabledAlgorithms.includes(checkbox.value);
      updateCheckboxContainer(checkbox);
    });
  }

  // 更新复选框容器的样式
  function updateCheckboxContainer(checkbox) {
    const container = checkbox.closest('.algorithm-checkbox-container');
    if (container) {
      if (checkbox.checked) {
        container.classList.add('checked');
      } else {
        container.classList.remove('checked');
      }
    }
  }

  // 根据启用的算法更新下拉选项
  function updateAlgorithmSelects(enabledAlgorithms) {
    const corners = ['leftTop', 'rightTop', 'leftBottom', 'rightBottom'];
    corners.forEach(cornerId => {
      const select = document.getElementById(cornerId);
      if (select) {
        const currentValue = select.value;
        // 移除所有选项
        select.innerHTML = '';
        // 添加启用的算法选项
        enabledAlgorithms.forEach(algo => {
          const option = document.createElement('option');
          option.value = algo;
          option.setAttribute('data-i18n', 'algorithmName' + algo);
          option.textContent = algo; // 在角落选择器中只显示缩写
          select.appendChild(option);
        });
        // 恢复之前选中的值（如果还在启用列表中）
        if (enabledAlgorithms.includes(currentValue)) {
          select.value = currentValue;
        }
      }
    });
    // 更新边缘显示
    updateEdgeDisplays();
  }

  // 监听算法复选框变化
  document.querySelectorAll('input[name="enabledAlgorithms"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      updateCheckboxContainer(this);
      const enabledAlgorithms = getEnabledAlgorithms();
      // 确保至少有一个算法被选中
      if (enabledAlgorithms.length === 0) {
        this.checked = true;
        updateCheckboxContainer(this);
        return;
      }
      updateAlgorithmSelects(enabledAlgorithms);
      saveConfig();
    });
  });
  
  // 监听角落选择器变化，更新边缘显示
  ['leftTop', 'rightTop', 'leftBottom', 'rightBottom'].forEach(cornerId => {
    const select = document.getElementById(cornerId);
    if (select) {
      select.addEventListener('change', () => {
        updateEdgeDisplays();
        saveConfig();
      });
    }
  });
  
  // 监听颜色选择变化
  document.querySelectorAll('input[name="boxColor"]').forEach(radio => {
    radio.addEventListener('change', function() {
      updateThemeColor(this.value);
      saveConfig();
    });
  });
  
  // 监听激活模式变化
  document.querySelectorAll('input[name="activationMode"]').forEach(radio => {
    radio.addEventListener('change', saveConfig);
  });
  
  // 角落悬停高亮对应边缘
  const cornerEdgeMap = {
    cornerLeftTop: 'edgeTop',
    cornerRightTop: 'edgeRight',
    cornerLeftBottom: 'edgeLeft',
    cornerRightBottom: 'edgeBottom'
  };
  
  Object.entries(cornerEdgeMap).forEach(([cornerId, edgeId]) => {
    const corner = document.getElementById(cornerId);
    const edge = document.getElementById(edgeId);
    if (corner && edge) {
      corner.addEventListener('mouseenter', () => {
        edge.classList.add('highlight');
        corner.classList.add('active');
      });
      corner.addEventListener('mouseleave', () => {
        edge.classList.remove('highlight');
        corner.classList.remove('active');
      });
    }
  });

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

  // 获取启用的算法列表
  function getEnabledAlgorithms() {
    const checkboxes = document.querySelectorAll('input[name="enabledAlgorithms"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
  }

  // 自动保存配置
  function saveConfig() {
    var activationModeInput = document.querySelector('input[name="activationMode"]:checked');
    var activationMode = activationModeInput ? activationModeInput.value : 'manual';
    var boxColorInput = document.querySelector('input[name="boxColor"]:checked');
    var boxColor = boxColorInput ? boxColorInput.value : '#27ae60';
    // 从角落选择器获取边缘算法
    var top = document.getElementById('leftTop').value;
    var right = document.getElementById('rightTop').value;
    var left = document.getElementById('leftBottom').value;
    var bottom = document.getElementById('rightBottom').value;
    var enabledAlgorithms = getEnabledAlgorithms();

    var config = {
        activationMode: activationMode, 
        boxColor: boxColor, 
        algorithm: {
            top: top, right: right, bottom: bottom, left: left 
        },
        enabledAlgorithms: enabledAlgorithms
    };
    chrome.storage.sync.set({HiTable: config}, function() {
      showSaveStatus();
    });
  }
};