var config = {};
var startCell = null;
var endCell = null;
var originalTable = null;
var currentCell = null;
var isMouseDown = false;
var selectedCellsData = [];
var overlayTables = {}; 

// 注册鼠标事件监听器
// Mouse down event
window.HiTableHandleMouseDown = function(event) {
  if (event.button === 0 && event.target.tagName.toLowerCase() === 'td') {
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
    startCell = event.target;
    endCell = event.target;
    originalTable = startCell.closest('table');
  }
}

window.HiTableHandleMouseOver = function(event) {
  if (isMouseDown && event.target.tagName.toLowerCase() === 'td' && event.target !== currentCell) {
    endCell = event.target;
    // 每当鼠标移动时，先删除所有被高亮的单元格
    deleteAllCellSelected();
    currentCell = endCell;
    if (startCell !== endCell) {
      // 保证选择过程可见
      selectCellsAndFillArray();
    }
  }
}

window.HiTableHandleMouseUp = function(event) {
  if (isMouseDown && event.target.tagName.toLowerCase() === 'td') {
    isMouseDown = false;
    if (startCell !== endCell) {
      //selectCellsAndFillArray();
      showOverlay();
      calculation();
    }
  }
}

// 初始化，代码入口
init();

// 初始化
function init() {
  document.addEventListener('mousedown', window.HiTableHandleMouseDown);
  document.addEventListener('mouseover', window.HiTableHandleMouseOver);
  document.addEventListener('mouseup', window.HiTableHandleMouseUp);

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
  let newConfig = {
    boxColor: '#c0392b',
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
      newConfig = data.HiTable;
    }
    return newConfig;
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
    sheet.insertRule('.HiTableOverlay { background-color: rgba(' + rgbaColor + '1); }', sheet.cssRules.length);
    sheet.insertRule('td[cell-selected="true"] { background-color: rgba(' + rgbaColor + '0.5); }', sheet.cssRules.length);
    sheet.insertRule('td.cell-highlighted { background-color: rgba(' + rgbaColor + '1); }', sheet.cssRules.length);
  }
}

// 清除所有被高亮的单元格
function deleteAllCellSelected() {
  Array.from(document.getElementsByTagName('td')).forEach(td => td.removeAttribute('cell-selected'));
}

// 选择单元格并填充数组
function selectCellsAndFillArray() {

  const [ topLeft, bottomRight ] = getSelectedRect();

  const top = getRowIndex(topLeft);
  const left = getCellIndex(topLeft);
  const bottom = getRowIndex(bottomRight);
  const right = getCellIndex(bottomRight);

  let parentTable = topLeft.parentElement.parentElement; // 获取单元格的父级表格，也有可能是 tbody
  selectedCellsData = []; // 清空数组

  for (let r = 0; r <= bottom - top; r++) {
    for (let c = 0; c <= right - left; c++) {
      let cell = parentTable.rows[top + r].cells[left + c];
      let value = parseFloat(cell.innerText);
      value = isNaN(value) ? 0 : value;

      if (selectedCellsData[r] === undefined) {
        selectedCellsData[r] = [];
      }
      selectedCellsData[r][c] = value;
      // 高亮单元格
      cell.setAttribute('cell-selected', 'true');

      cell.addEventListener('mouseover', function() {
        // 获取十字单元格
        const crossCells = getCrossCells(this);
        // 高亮十字单元格
        crossCells.forEach(crossCell => crossCell.classList.add('cell-highlighted'));
      });

      cell.addEventListener('mouseout', function() {
        // 获取十字单元格
        const crossCells = getCrossCells(this);

        // 取消高亮十字单元格
        crossCells.forEach(crossCell => crossCell.classList.remove('cell-highlighted'));
      });
    }
  }
}

// 获取矩形选择区的左上角和右下角单元格
function getSelectedRect() {
  const startRowIndex = getRowIndex(startCell);
  const startCellIndex = getCellIndex(startCell);
  const endRowIndex = getRowIndex(endCell);
  const endCellIndex = getCellIndex(endCell);

  // 选择区域的索引边界
  const top = Math.min(startRowIndex, endRowIndex);
  const bottom = Math.max(startRowIndex, endRowIndex);
  const left = Math.min(startCellIndex, endCellIndex);
  const right = Math.max(startCellIndex, endCellIndex);  

  let parentTable = startCell.parentElement.parentElement; // 获取单元格的父级表格，也有可能是 tbody
  let topLeft = parentTable.rows[top].cells[left];
  let bottomRight = parentTable.rows[bottom].cells[right];
  return [ topLeft, bottomRight ];
}

// 获取单元格的行索引
function getRowIndex(cell) {
  return Array.from(cell.parentElement.parentElement.rows).indexOf(cell.parentElement);
}
// 获取单元格的列索引
function getCellIndex(cell) {
  return Array.from(cell.parentElement.cells).indexOf(cell);
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

  // 清空 overlayTables 内容
  Object.values(overlayTables).forEach((table) => {
    while (table.firstChild) {
        table.firstChild.remove();
    }
  });

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

    overlayTables.topLeft.addEventListener('mouseover', () => highlightOverlayTable('top', true));
    overlayTables.bottomLeft.addEventListener('mouseover', () => highlightOverlayTable('left', true));
    overlayTables.topRight.addEventListener('mouseover', () => highlightOverlayTable('right', true));
    overlayTables.bottomRight.addEventListener('mouseover', () => highlightOverlayTable('bottom', true));
    // 当鼠标移出时，取消高亮
    overlayTables.topLeft.addEventListener('mouseout', () => highlightOverlayTable('top', false));
    overlayTables.bottomLeft.addEventListener('mouseout', () => highlightOverlayTable('left', false));
    overlayTables.topRight.addEventListener('mouseout', () => highlightOverlayTable('right', false));
    overlayTables.bottomRight.addEventListener('mouseout', () => highlightOverlayTable('bottom', false));

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
    cells.push(row.cells[i]);
  }
  return cells;
}
// 获取指定列的单元格
function getCellsInColumn(table, colIndex, startRow = 0, endRow = table.rows.length - 1) {
  const cells = [];
  for (let i = startRow; i <= endRow; i++) {
    cells.push(table.rows[i].cells[colIndex]);
  }
  return cells;
}

// 创建覆盖表格并添加单元格
function createOverlayTable(direction, left, top, cells) {
  if (!overlayTables[direction]) {
    const overlayTable = originalTable.cloneNode(false); // 复制原表格，但不复制子节点
    const style = window.getComputedStyle(originalTable);
    overlayTable.classList.add('HiTableOverlay');
    overlayTable.id = `HiTableOverlay-${direction}`;
    overlayTable.style.borderSpacing = style.borderSpacing; // 设置边线间距
    overlayTable.style.borderCollapse = style.borderCollapse; // 设置边线合并
    overlayTable.style.padding = style.padding; // 设置内边距
    overlayTable.style.border = style.border; // 设置边线样式
    
    overlayTables[direction] = overlayTable;
    document.body.appendChild(overlayTable);
  }

  if (cells.length > 0) {
    let copiedCells = copyCells(cells);
    appendToTable(overlayTables[direction], copiedCells);
  }

  overlayTables[direction].style.left = `${left}px`;
  overlayTables[direction].style.top = `${top}px`;
}
  
// 复制单元格
function copyCells(cells) {
  const copiedCells = [];
  const isRow = cells.length > 1 && cells[0].parentElement === cells[1].parentElement; // 判断是否为一行
  const padding = parseFloat(window.getComputedStyle(cells[0]).paddingLeft); // 获取单元格内边距
  const borderWidth = parseFloat(window.getComputedStyle(cells[0]).borderWidth); // 获取单元格边线宽度
  const borderCollapse = window.getComputedStyle(originalTable).borderCollapse; // 获取表格的边框样式
  const isBorderCollapsed = borderCollapse === 'collapse'; // 判断边框是否合并
  const borderWidthToSubtract = isBorderCollapsed ? borderWidth : 2 * borderWidth; // 如果边框合并，只减去一个边框宽度，否则减去两个
  if (isRow) {
      const tr = document.createElement('tr');
      cells.forEach((cell, index) => {
          const clone = cell.cloneNode(false);
          clone.removeAttribute('cell-selected');
          const div = document.createElement('div');
          div.style.width = `${cell.offsetWidth - 2 * padding - borderWidthToSubtract}px`; // 考虑边线宽度
          div.style.height = `${cell.offsetHeight - 2 * padding - borderWidthToSubtract}px`; // 考虑边线宽度
          clone.appendChild(div);
          tr.appendChild(clone);
      });
      copiedCells.push(tr);
  } else {
      cells.forEach((cell, index) => {
          const tr = document.createElement('tr');
          const clone = cell.cloneNode(false);
          clone.removeAttribute('cell-selected');
          const div = document.createElement('div');
          div.style.width = `${cell.offsetWidth - 2 * padding - borderWidthToSubtract}px`; // 考虑边线宽度
          div.style.height = `${cell.offsetHeight - 2 * padding - borderWidthToSubtract}px`; // 考虑边线宽度
          clone.appendChild(div);
          tr.appendChild(clone);
          copiedCells.push(tr);
      });
  }
  return copiedCells;
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
          td.classList.add('cell-highlighted');
        } else {
          td.classList.remove('cell-highlighted');
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

// 统计算法名称
const algorithmNames = {
  CNT: 'count',
  SUM: 'sum',
  AVG: 'average',
  VAR: 'variance',
  MIN: 'minimum',
  MAX: 'maximum',
  RNG: 'range',
  MED: 'median',
  STD: 'standard deviation',
};

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
function calculation() {
  const overlayTableDirections = ['top', 'right', 'bottom', 'left'];
  const cornerTableDirections = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];

  for (let i = 0; i < overlayTableDirections.length; i++) {
    const direction = overlayTableDirections[i];
    const cornerDirection = cornerTableDirections[i];
    const overlayTable = overlayTables[direction];
    const cornerTable = overlayTables[cornerDirection];
    const algorithm = config.algorithm[direction.toLowerCase()];
    
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
              value = statistics[algorithm](data);
              title = `${isColumn ? 'Column' : 'Row'} ${index + 1} ${algorithmNames[algorithm]}: ${value}`;
            } else {
              console.error(`Unknown algorithm: ${algorithm}`);
              value = 'N/A';
              title = `Unknown algorithm: ${algorithm}`;
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
