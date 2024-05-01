(function() {

  let config = {};
  let startCell = null;
  let endCell = null;
  let originalTable = null;
  let parentTable = null; // 获取单元格的父级表格，也有可能是 tbody
  let currentCell = null;
  let isMouseDown = false;
  let selectedCellsData = [];
  let overlayTables = {}; 
  let lastPressCtrlC = 0;


  const overlayTableDirections = ['top', 'left', 'right', 'bottom'];
  const cornerTableDirections = ['topLeft', 'bottomLeft', 'topRight', 'bottomRight'];
  // 统计算法名称
  const algorithmNames = {
    CNT: chrome.i18n.getMessage('algorithmNameCNT'),
    SUM: chrome.i18n.getMessage('algorithmNameSUM'),
    AVG: chrome.i18n.getMessage('algorithmNameAVG'),
    VAR: chrome.i18n.getMessage('algorithmNameVAR'),
    MIN: chrome.i18n.getMessage('algorithmNameMIN'),
    MAX: chrome.i18n.getMessage('algorithmNameMAX'),
    RNG: chrome.i18n.getMessage('algorithmNameRNG'),
    MED: chrome.i18n.getMessage('algorithmNameMED'),
    STD: chrome.i18n.getMessage('algorithmNameSTD'),
};

  // 注册鼠标事件监听器
  // Mouse down event
  window.HiTableHandleMouseDown = function(event) {
    let cell = event.target;
    if (event.button === 0 && 
      (cell.tagName.toLowerCase() === 'td' || cell.tagName.toLowerCase() === 'th') && 
      !cell.closest('thead') &&
      !cell.closest('table').classList.contains('HiTableOverlay')) {
      // 阻止默认的表格选择
      event.preventDefault();
      deleteAllCellSelected(); // 删除所有选择
      // 清空 overlayTables 内容
      Object.values(overlayTables).forEach((table) => {
          while (table.firstChild) {
            table.firstChild.remove();
          }
        });
      isMouseDown = true;
      startCell = cell;
      endCell = cell;
      originalTable = startCell.closest('table');
      parentTable = startCell.parentElement.parentElement; // 获取单元格的父级表格，也有可能是 tbody
      if (event.shiftKey && getColIndex(startCell) === 0 && getRowIndex(startCell) === 0) {
        // 如果在 (0,0) 位置按下 Shift 键，则选择整个表格
        endCell = parentTable.rows[parentTable.rows.length - 1].cells[parentTable.rows[0].cells.length - 1];
        selectCellsAndFillArray();
      }
    }
  }

  window.HiTableHandleMouseOver = function(event) {
    let cell = event.target;
    if (isMouseDown && 
      (cell.tagName.toLowerCase() === 'td' || cell.tagName.toLowerCase() === 'th') && 
      !cell.closest('thead') && 
      !cell.closest('table').classList.contains('HiTableOverlay') && 
      cell !== currentCell) {
      currentCell = cell;
      if (event.shiftKey) {
        if (getColIndex(startCell) === 0 && getColIndex(currentCell) === 0) {
          // 如果 startCell 和 currentCell 都在第一列，则选择这两个单元格之间的所有行
          endCell = parentTable.rows[getRowIndex(currentCell)].cells[parentTable.rows[0].cells.length - 1];
        } else if (getRowIndex(startCell) === 0 && getRowIndex(currentCell) === 0) {
          // 如果 startCell 和 currentCell 都在第一行，则选择这两个单元格之间的所有列
          endCell = parentTable.rows[parentTable.rows.length - 1].cells[getColIndex(currentCell)];
        } else {
          // 否则，选择区域
          endCell = currentCell;
        }
      } else {
        endCell = currentCell;
      }
      // 每当鼠标移动时，先删除所有被选择和高亮的单元格
      deleteAllCellSelected();
      if (startCell !== endCell && startCell !== null && endCell !== null) {
        // 保证选择过程可见
        selectCellsAndFillArray();
      }
    }
  }

  window.HiTableHandleMouseUp = function(event) {
    let cell = event.target;
    if (isMouseDown && 
      (cell.tagName.toLowerCase() === 'td' || cell.tagName.toLowerCase() === 'th') && 
      !cell.closest('thead') &&
      !cell.closest('table').classList.contains('HiTableOverlay')) {
      isMouseDown = false;
      if (startCell !== endCell && startCell !== null && endCell !== null) {
        //selectCellsAndFillArray();
        showOverlay();
        calculation();
      }
    }
  }

  window.HiTableHandleKeyDown = function(event) {
    if (event.key === 'Escape') {
      deleteAllCellSelected();
      Object.values(overlayTables).forEach((table) => {
        while (table.firstChild) {
          table.firstChild.remove();
        }
      });
    }

    if ((event.key === 'c' || event.key === 'C') && (event.ctrlKey || event.metaKey)) {
      let pressCtrlC = Date.now();
      // 复制选中的单元格数据
      let text = '';
      for (let i = 0; i < selectedCellsData.length; i++) {
        for (let j = 0; j < selectedCellsData[i].length; j++) {
          text += selectedCellsData[i][j] + '\t';
        }
        text += '\n';
      }
      if (pressCtrlC - lastPressCtrlC < 500) {
        text = '';
        // 如果两次按下 Ctrl+C 的时间间隔小于 500 毫秒，则复制也包括外围表格的数据  
      
        // 第一行：topLeft、top、topRight
        text += overlayTables['topLeft'].querySelector('div').textContent + '\t';
        overlayTables['top'].querySelectorAll('td').forEach(td => {
          text += td.querySelector('div').textContent + '\t';
        });
        text += overlayTables['topRight'].querySelector('div').textContent + '\n';
      
        // 中间行：left 的每一个单元格、选择区每一行、right 的每一个单元格
        const leftCells = overlayTables['left'].querySelectorAll('td');
        const rightCells = overlayTables['right'].querySelectorAll('td');
        for (let i = 0; i < selectedCellsData.length; i++) {
          text += leftCells[i].querySelector('div').textContent + '\t';
          for (let j = 0; j < selectedCellsData[i].length; j++) {
            text += selectedCellsData[i][j] + '\t';
          }
          text += rightCells[i].querySelector('div').textContent + '\n';
        }
      
        // 最后一行：bottomLeft、bottom、bottomRight
        text += overlayTables['bottomLeft'].querySelector('div').textContent + '\t';
        overlayTables['bottom'].querySelectorAll('td').forEach(td => {
          text += td.querySelector('div').textContent + '\t';
        });
        text += overlayTables['bottomRight'].querySelector('div').textContent + '\n';
      }

      navigator.clipboard.writeText(text);
      lastPressCtrlC = pressCtrlC;
    }
  }

  // 初始化，代码入口
  init();

  // 初始化
  function init() {
    document.addEventListener('mousedown', window.HiTableHandleMouseDown);
    document.addEventListener('mouseover', window.HiTableHandleMouseOver);
    document.addEventListener('mouseup', window.HiTableHandleMouseUp);
    document.addEventListener('keydown', window.HiTableHandleKeyDown);

    // 引入外部样式表
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('../src/assets/main.css');
    link.id = 'HiTableCSS'; // Add an ID to the link element
    (document.head || document.documentElement).appendChild(link);
    
    loadOptions().then((newConfig) => {
      // 在这里，loadOptions 已经完成，你可以使用它的结果处理配置值
      config = newConfig;
      parseConfig(config);
    }).catch((error) => {
      console.error('Failed to load options', error);
    });
  }

  // 配置相关部分
  // 异步加载配置
  async function loadOptions() {
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

    // 从Chrome的存储中读取配置值
    try {
      const data = await getStorageData('HiTable');
      // 获取配置值
      if (data.HiTable) {
        defaultConfig = data.HiTable;
      }
      return defaultConfig;
    } catch (error) {
      console.error(error);
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

  // 根据配置值修改样式表
  function parseConfig(config) {
    if (config && config.boxColor) {
      // 检查是否已经存在一个样式表
      var style = document.getElementById('HiTableStyle');
      if (!style) {
        // 如果不存在，创建一个新的样式表
        style = document.createElement('style');
        style.id = 'HiTableStyle';
        document.head.appendChild(style);
      }
      var sheet = style.sheet;

      // 清空原有的样式表
      for (var i = sheet.cssRules.length - 1; i >= 0; i--) {
        sheet.deleteRule(i);
      }
      // 将颜色值转换为rgba格式
      var rgbaColor = parseInt(config.boxColor.slice(1, 3), 16) + ', ' + parseInt(config.boxColor.slice(3, 5), 16) + ', ' + parseInt(config.boxColor.slice(5, 7), 16) + ', ';

      // 插入新的CSS规则
      sheet.insertRule('.HiTableOverlay td { background-color: rgba(' + rgbaColor + '1); }', sheet.cssRules.length);
      sheet.insertRule('td[cell-selected="true"], th[cell-selected="true"] { background-color: rgba(' + rgbaColor + '0.5); }', sheet.cssRules.length);
      sheet.insertRule('td[cell-highlighted="true"], th[cell-highlighted="true"] { background-color: rgba(' + rgbaColor + '1); }', sheet.cssRules.length);
    }
  }

  // 清除所有被高亮的单元格
  function deleteAllCellSelected() {
    const cells = document.querySelectorAll('td, th');
    cells.forEach(cell => {
      cell.removeAttribute('cell-selected');
      cell.removeAttribute('cell-isNaN');
      cell.removeAttribute('cell-highlighted');
    });
  }

  // 选择单元格并填充数组
  function selectCellsAndFillArray() {

    const [ topLeft, bottomRight ] = getSelectedRect();

    const top = getRowIndex(topLeft);
    const left = getColIndex(topLeft);
    const bottom = getRowIndex(bottomRight);
    const right = getColIndex(bottomRight);

    selectedCellsData = []; // 清空数组

    for (let r = 0; r <= bottom - top; r++) {
      for (let c = 0; c <= right - left; c++) {
        let cell = parentTable.rows[top + r].cells[left + c];
        let value = parseNumber(cell.innerText);

        if (selectedCellsData[r] === undefined) {
          selectedCellsData[r] = [];
        }
        selectedCellsData[r][c] = value;
        if (isNaN(value)) {
          cell.setAttribute('cell-isNaN', 'true');
        }
        // 高亮单元格
        cell.setAttribute('cell-selected', 'true');

        cell.addEventListener('mouseover', function() {
          // 获取十字单元格
          const crossCells = getCrossCells(this);
          // 高亮十字单元格
          crossCells.forEach(crossCell => crossCell.setAttribute('cell-highlighted', 'true'));
        });

        cell.addEventListener('mouseout', function() {
          // 获取十字单元格
          const crossCells = getCrossCells(this);

          // 取消高亮十字单元格
          crossCells.forEach(crossCell => crossCell.removeAttribute('cell-highlighted'));
        });
      }
    }
  }

  function parseNumber(text) {
    // 移除货币符号：美元、欧元、英镑、人民币/日元、俄罗斯卢布、印度卢比、港币、新台币
    text = text.replace(/[\$€£¥₽₹]|HK\$|NT\$/g, '');

    // 处理百分比
    let isPercentage = false;
    if (text.endsWith('%')) {
      text = text.slice(0, -1);
      isPercentage = true;
    }

    if (!/^[-+]?[\d,\.]*$/.test(text)) {
      return NaN;
    }
    // Create a NumberFormat object for the user's locale
    let formatter = new Intl.NumberFormat();
  
    // Format a test number and check the result
    let testNumber = formatter.format(123.45);
  
    if (testNumber.includes(',')) {
      // If the formatted number includes a comma, assume that comma is the decimal separator
      text = text.replace(/\./g, '').replace(/,/g, '.');
    } else {
      // Otherwise, assume that dot is the decimal separator
      text = text.replace(/,/g, '');
    }
  
    let value = parseFloat(text);

    // 如果是百分比，将值除以100
    if (isPercentage) {
      value /= 100;
    }

    return value;
  }
  
  // 获取矩形选择区的左上角和右下角单元格
  function getSelectedRect() {
    const startRowIndex = getRowIndex(startCell);
    const startColIndex = getColIndex(startCell);
    const endRowIndex = getRowIndex(endCell);
    const endColIndex = getColIndex(endCell);
    console.log(startRowIndex, startColIndex, endRowIndex, endColIndex);

    // 选择区域的索引边界
    const top = Math.min(startRowIndex, endRowIndex);
    const bottom = Math.max(startRowIndex, endRowIndex);
    const left = Math.min(startColIndex, endColIndex);
    const right = Math.max(startColIndex, endColIndex);

    let parentTable = startCell.parentElement.parentElement; // 获取单元格的父级表格，也有可能是 tbody
    let topLeft = parentTable.rows[top].cells[left];
    let bottomRight = parentTable.rows[bottom].cells[right];
    return [ topLeft, bottomRight ];
  }

  // 获取单元格的行索引
  function getRowIndex(cell) {
    if (!cell || !cell.parentElement || !cell.parentElement.parentElement ||
      !cell.parentElement.parentElement.rows || typeof cell.parentElement.parentElement.rows.length !== 'number') {
      throw new Error('Invalid cell');
    }
    return Array.from(cell.parentElement.parentElement.rows).indexOf(cell.parentElement);
  }

  // 获取单元格的列索引
  function getColIndex(cell) {
    if (!cell || !cell.parentElement || 
      !cell.parentElement.cells || typeof cell.parentElement.cells.length !== 'number') {
      throw new Error('Invalid cell');
    }
    return Array.from(cell.parentElement.cells).indexOf(cell);
  }
  // 外围角点击处理程序
  function cornerClick(direction) {
    return (event) => {
      // 找到当前算法在算法列表中的位置
      const algorithms = Object.keys(algorithmNames);
      const algorithm = config.algorithm[direction.toLowerCase()];
      const index = algorithms.indexOf(algorithm);
      // 切换到下一个算法，如果已经是最后一个算法，那么切换到第一个算法
      const nextAlgorithm = algorithms[(index + 1) % algorithms.length];
      // 更新配置
      config.algorithm[direction.toLowerCase()] = nextAlgorithm;
      // 重新计算结果
      calculation(direction, nextAlgorithm);
    };
  }

  // 显示覆盖表格
  function showOverlay() {
    const [topLeft, bottomRight] = getSelectedRect();

    // 计算外延区域的边界
    const startRect = topLeft.getBoundingClientRect();
    const endRect = bottomRight.getBoundingClientRect();
    
    // 选择区域的显示边界
    const left = Math.min(startRect.left + window.scrollX, endRect.left + window.scrollX);
    const right = Math.max(startRect.right + window.scrollX, endRect.right + window.scrollX);
    const top = Math.min(startRect.top + window.scrollY, endRect.top + window.scrollY);
    const bottom = Math.max(startRect.bottom + window.scrollY, endRect.bottom + window.scrollY);

    // 获取相邻的外边单元格
    const adjacentCells = getAdjacentCells(topLeft, bottomRight);

    // 获取左上角单元格的高度和宽度
    let offsetHeight = topLeft.offsetHeight;
    let offsetWidth = topLeft.offsetWidth;

    // 创建覆盖表格并添加相邻的外边单元格
    if (adjacentCells.leftColumn.length > 1) {
      createOverlayTable('top', left, top - offsetHeight, adjacentCells.topRow);
      createOverlayTable('bottom', left, bottom, adjacentCells.bottomRow);
    }
    if (adjacentCells.topRow.length > 1) {
      createOverlayTable('left', left - offsetWidth, top, adjacentCells.leftColumn);
      createOverlayTable('right', right, top, adjacentCells.rightColumn);
    }
    if (adjacentCells.leftColumn.length > 1 && adjacentCells.topRow.length > 1) {
      // 创建四个角的覆盖表格
      createOverlayTable('topLeft', left - offsetWidth, top - offsetHeight, [adjacentCells.topRow[0]]);
      createOverlayTable('bottomLeft', left - offsetWidth, bottom, [adjacentCells.bottomRow[0]]);
      createOverlayTable('topRight', right, top - offsetHeight, [adjacentCells.topRow[adjacentCells.topRow.length - 1]]);
      createOverlayTable('bottomRight', right, bottom, [adjacentCells.bottomRow[adjacentCells.bottomRow.length - 1]]);
    
      for (let i = 0; i < cornerTableDirections.length; i++) {
        const direction = overlayTableDirections[i];
        const cornerDirection = cornerTableDirections[i];
    
        overlayTables[cornerDirection].addEventListener('mouseover', () => highlightOverlayTable(direction, true));
        overlayTables[cornerDirection].addEventListener('mouseout', () => highlightOverlayTable(direction, false));
        overlayTables[cornerDirection].addEventListener('click', cornerClick(direction));
      }

    }
  }

  // 获取相邻的外边单元格
  function getAdjacentCells(start, end) {
    const topRow = getCellsInRow(start.parentElement, start.cellIndex, end.cellIndex);
    const bottomRow = getCellsInRow(end.parentElement, start.cellIndex, end.cellIndex);
    const leftColumn = getCellsInColumn(start.parentElement.parentElement, start.cellIndex, getRowIndex(start), getRowIndex(end));
    const rightColumn = getCellsInColumn(start.parentElement.parentElement, end.cellIndex, getRowIndex(start), getRowIndex(end));
    
    return {
      topRow,
      bottomRow,
      leftColumn,
      rightColumn,
    };
  }

  // 获取指定行的单元格
  function getCellsInRow(row, startCellIndex, endCellIndex) {
    // 如果开始索引大于结束索引，交换它们
    if (startCellIndex > endCellIndex) {
      [startCellIndex, endCellIndex] = [endCellIndex, startCellIndex];
    }
    const cells = [];
    for (let i = startCellIndex; i <= endCellIndex; i++) {
      cells.push(row.cells[i] || null);
    }
    return cells;
  }
  // 获取指定列的单元格
  function getCellsInColumn(table, col, startRow = 0, endRow = table.rows.length - 1) {
    let cells = [];
    for (let i = startRow; i <= endRow; i++) {
      let row = table.rows[i];
      if (row) {
        cells.push(row.cells[col] || null);
      } else {
        cells.push(null);
      }
    }
    return cells;
  }

  // 创建覆盖表格并添加单元格
  function createOverlayTable(direction, left, top, cells) {
    if (overlayTables[direction]) {
      document.body.removeChild(overlayTables[direction]);
    }
    const overlayTable = originalTable.cloneNode(false); // 复制原表格，但不复制子节点
    const style = window.getComputedStyle(originalTable);
    overlayTable.className = ''; // 清除复制的表格的 class
    overlayTable.classList.add('HiTableOverlay');
    overlayTable.id = `HiTableOverlay-${direction}`;
    overlayTable.style.borderSpacing = style.borderSpacing; // 设置边线间距
    overlayTable.style.borderCollapse = style.borderCollapse; // 设置边线合并
    overlayTable.style.padding = style.padding; // 设置内边距
    overlayTable.style.border = style.border; // 设置边线样式
    
    overlayTables[direction] = overlayTable;
    document.body.appendChild(overlayTable);

    if (cells.length > 0) {
      let copiedCells = copyCells(cells);
      appendToTable(overlayTables[direction], copiedCells);
    }

    overlayTables[direction].style.left = `${left}px`;
    overlayTables[direction].style.top = `${top}px`;
  }

  function copyCells(cells) {
    const copiedCells = [];
    const nonNullCells = cells.filter(cell => cell !== null);
    const isRow = nonNullCells.length > 1 && nonNullCells[0].parentElement === nonNullCells[1].parentElement; // 判断是否为一行
  
    if (isRow) {
      const tr = document.createElement('tr');
      let prevCell = null;
      cells.forEach((cell, index) => {
        const clone = copyCell(cell);
        if (clone !== null) {
          tr.appendChild(clone);
          prevCell = clone;
        } else if (prevCell !== null) {
          prevCell.colSpan = (prevCell.colSpan || 1) + 1;
        }
      });
      copiedCells.push(tr);
    } else {
      let prevCell = null;
      cells.forEach((cell, index) => {
        const tr = document.createElement('tr');
        const clone = copyCell(cell);
        if (clone !== null) {
          tr.appendChild(clone);
          copiedCells.push(tr);
          prevCell = clone;
        } else if (prevCell !== null) {
          prevCell.rowSpan = (prevCell.rowSpan || 1) + 1;
        }
      });
    }
    return copiedCells;
  }

  // 复制单元格
  function copyCell(cell) {
    if (cell === null) {
      return null;
    }
    const padding = parseFloat(window.getComputedStyle(cell).paddingLeft); // 获取单元格内边距
    const borderWidth = parseFloat(window.getComputedStyle(cell).borderWidth); // 获取单元格边线宽度
    const borderStyle = window.getComputedStyle(cell).borderStyle; // 获取单元格边线样式
    const borderCollapse = window.getComputedStyle(cell.parentElement.parentElement).borderCollapse; // 获取表格的边框样式
    const borderWidthToSubtract = borderCollapse === 'collapse' ? borderWidth : 2 * borderWidth; // 如果边框合并，只减去一个边框宽度，否则减去两个
    let clone;
    if (cell.tagName.toLowerCase() === 'th') {
        clone = document.createElement('td');
        Array.from(cell.attributes).forEach(attr => clone.setAttribute(attr.name, attr.value)); // 复制属性
    } else {
        clone = cell.cloneNode(false);
    }
    clone.style.padding = `${padding}px`; // 设置复制的单元格的内边距
    clone.style.borderWidth = `${borderWidth}px`; // 设置复制的单元格的边线宽度
    clone.style.borderStyle = borderStyle; // 设置复制的单元格的边线样式
    clone.removeAttribute('cell-selected');
    clone.removeAttribute('cell-isNaN');
    const div = document.createElement('div');
    div.style.width = `${cell.offsetWidth - 2 * padding - borderWidthToSubtract}px`; // 考虑边线宽度
    div.style.height = `${cell.offsetHeight - 2 * padding - borderWidthToSubtract}px`; // 考虑边线宽度
    clone.appendChild(div);
    return clone;
  }

  // 添加行到表格
  function appendToTable(table, cells) {
      cells.forEach((tr) => table.appendChild(tr));
  }

  // 高亮覆盖表格
  function highlightOverlayTable(direction, highlight) {
    const overlayTable = overlayTables[direction];
    if (overlayTable) {
      const cells = overlayTable.querySelectorAll('td');
      if (cells) {
        cells.forEach((td) => {
          if (highlight) {
            td.setAttribute('cell-highlighted', 'true');
          } else {
            td.removeAttribute('cell-highlighted');
          }
        });
      }
    }
  }

  // 获取十字单元格
  function getCrossCells(cell) {
    if (originalTable === null) return [];
    const crossCells = [];

    // 获取当前单元格的行和列
    const row = cell.parentNode.rowIndex;
    const col = cell.cellIndex;

    // 获取当前行的所有单元格
    const rowCells = Array.from(originalTable.rows[row].cells);
    const selectedRowCells = rowCells.filter(cell => cell.hasAttribute('cell-selected'));
    crossCells.push(...selectedRowCells);

    // 获取当前列的所有单元格
    const colCells = getCellsInColumn(originalTable, col, 0, originalTable.rows.length - 1);
    const selectedColCells = colCells.filter(cell => cell.hasAttribute('cell-selected'));
    crossCells.push(...selectedColCells);

    // 获取外围的四个边表格中，与高亮十字接壤的四个单元格
    if (selectedRowCells.length > 0 && selectedColCells.length > 0) {
      const edgeCells = getEdgeCells(row - selectedColCells[0].parentNode.rowIndex, col - selectedRowCells[0].cellIndex);
      crossCells.push(...edgeCells);
    }
    return crossCells;
  }

  // 获取边缘单元格
  function getEdgeCells(row, col) {
    const edgeCells = [];

    // 获取上边的单元格
    if (overlayTables.top && overlayTables.top.rows.length > 0) {
      edgeCells.push(overlayTables.top.rows[0].cells[col]);
    }

    // 获取下边的单元格
    if (overlayTables.bottom && overlayTables.bottom.rows.length > 0) {
      edgeCells.push(overlayTables.bottom.rows[0].cells[col]);
    }

    // 获取左边的单元格
    if (overlayTables.left && overlayTables.left.rows.length > 0) {
      edgeCells.push(overlayTables.left.rows[row].cells[0]);
    }

    // 获取右边的单元格
    if (overlayTables.right && overlayTables.right.rows.length > 0) {
      edgeCells.push(overlayTables.right.rows[row].cells[0]);
    }

    return edgeCells;
  }

  // 统计函数
  const statistics = {
    CNT: (data) => data.length,
    SUM: (data) => data.reduce((a, item) => a + item, 0),
    AVG: (data) => {
      const sum = statistics['SUM'](data);
      const count = data.length;
      return sum / count;
    },
    VAR: (data) => {
      const avg = statistics['AVG'](data);
      return data.reduce((sum, item) => sum + ((item - avg) ** 2), 0) / data.length;
    },
    MIN: (data) => Math.min(...data),
    MAX: (data) => Math.max(...data),
    RNG: (data) => statistics['MAX'](data) - statistics['MIN'](data),
    MED: (data) => {
      const sorted = data.slice().sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);

      if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
      } else {
        return sorted[middle];
      }
    },
    STD: (data) => {
      const variance = statistics['VAR'](data);
      return Math.sqrt(variance);
    },
  };

  // 计算
  function calculation(targetDirection, targetAlgorithm) {
    for (let i = 0; i < overlayTableDirections.length; i++) {
      const direction = overlayTableDirections[i];
      const cornerDirection = cornerTableDirections[i];
      const overlayTable = overlayTables[direction];
      const cornerTable = overlayTables[cornerDirection];
      let algorithm = config.algorithm[direction.toLowerCase()];
      
      // 如果提供了 targetDirection 和 targetAlgorithm，那么只计算指定的边的指定算法
      if (targetDirection && targetAlgorithm) {
        if (direction === targetDirection) {
          algorithm = targetAlgorithm;
        } else {
          continue;
        }
      }

      if (overlayTable) {
        const cells = overlayTable.querySelectorAll('td');
        if (cells) {
          cells.forEach((td, index) => {
            const div = td.querySelector('div');
            let value;
            let title;

            if (algorithm) {
              const isColumn = direction === 'top' || direction === 'bottom';
              const data = isColumn ? selectedCellsData.map(row => row[index]) : selectedCellsData[index];
              if (statistics[algorithm]) {
                // 过滤掉非数字的值
                value = data.filter(value => !isNaN(value));
                value = statistics[algorithm](value);
                title = chrome.i18n.getMessage('statisticsTitle', [isColumn ? chrome.i18n.getMessage('Column') : chrome.i18n.getMessage('Row'), index + 1, algorithmNames[algorithm], value]);
              } else {
                console.error(`Unknown algorithm: ${algorithm}`);
                value = 'N/A';
                title = chrome.i18n.getMessage('unknownAlgorithm') + algorithm;
              }
            }

            div.textContent = value;
            div.title = title;
          });
        }
      }

      if (cornerTable) {
        const div = cornerTable.querySelector('div');
        if (div) {
          div.textContent = algorithm;
        }
      }
    }
  }
})();