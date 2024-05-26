(function() {

  // ==========================================
  // 全局变量
  // ==========================================
  let config = {};
  let startCell = null;
  let endCell = null;
  let originalTable = null; // 原始表格
  let logicTable = null;    // 逻辑表格
  let currentCell = null;
  let isMouseDown = false;
  let selectedCellsData = [];
  let overlayTable = null; 
  let lastPressCtrlC = 0;


  const directions = ['top', 'right', 'bottom', 'left'];
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

  // ==========================================
  // 类定义：逻辑单元格
  // ==========================================
  class LogicCell {
    static colWidths = []; // 保存每一列的宽度
    static rowHeights = []; // 保存每一行的高度

    constructor(logicTable, cell, row, col) {
      this.logicTable = logicTable; // 逻辑表格
      this.row = row; // 行索引
      this.col = col; // 列索引
      this.cell = cell; // 实际单元格
    }

    // 比较两个逻辑单元格是否指向同一个单元格
    isSameCell(other) {
      return this.cell === other.cell;
    }

    // 获取单元格的宽度
    width() {
      // 如果该列的宽度已知，直接返回
      if (LogicCell.colWidths[this.col]) {
        return LogicCell.colWidths[this.col];
      }

      // 计算该列的宽度
      let width;
      // 如果单元格不跨列
      if (this.cell.colSpan === 1) {
        width = this.cell.offsetWidth;
      } else {
        // 获取其它行不跨列单元格的宽度
        for (let row = 0; row < this.logicTable.rows.length; row++) {
          let cell = this.logicTable.rows[row][this.col].cell;
          if (cell.colSpan === 1) {
            width = cell.offsetWidth;
            break;
          }
        }
        if (width === 0) {
          width = this.cell.offsetWidth / this.cell.colSpan;
        }
      }
      // 保存该列的宽度
      LogicCell.colWidths[this.col] = width;
      return width;
    }

    // 获取单元格的高度
    height() {
      // 如果该行的高度已知，直接返回
      if (LogicCell.rowHeights[this.row]) {
        return LogicCell.rowHeights[this.row];
      }

      // 计算该行的高度
      let height;
      // 如果单元格不跨行
      if (this.cell.rowSpan === 1) {
        height = this.cell.offsetHeight;
      } else {
        // 获取不跨行单元格的高度
        for (let col = 0; col < this.logicTable.rows[this.row].length; col++) {
          let cell = this.logicTable.rows[this.row][col].cell;
          if (cell.rowSpan === 1) {
            height = cell.offsetHeight;
            break;
          }
        }
        if (height === 0) {
          height = this.cell.offsetHeight / this.cell.rowSpan;
        }
      }
      // 保存该行的高度
      LogicCell.rowHeights[this.row] = height;
      return height;
    }
  }
  // ==========================================
  // 类定义：逻辑表格
  // ==========================================
  class LogicTable {
    constructor(table) {
      this.originalTable = table;
      // 逻辑表格
      this.rows = [];
      // 原表格中的单元格到逻辑表格中的单元格的映射
      this.cellMap = new Map();
      this.generate();
      this.totalRows = this.rows.length;
      this.totalCols = this.rows[0].length;
    }
    generate() {
      let originalRows = this.originalTable.rows;
      let offsets = []; // 用于记录每一行的偏移量
      for (let i = 0; i < originalRows.length; i++) {
        let originalRow = originalRows[i];
        let col = 0;
        for (let j = 0; j < originalRow.cells.length; j++) {
          let cell = originalRow.cells[j];
          let rowspan = cell.rowSpan;
          let colspan = cell.colSpan;
          // 考虑之前的单元格对当前单元格的“侵占”
          while (offsets[i] && offsets[i][col]) {
            col++;
          }
          for (let k = 0; k < rowspan; k++) {
            for (let l = 0; l < colspan; l++) {
              // 确保 this.rows[i + k] 已经被初始化
              if (!this.rows[i + k]) {
                this.rows[i + k] = [];
              }
              // 逻辑表格中的单元格是原始表格中的单元格的复制
              let logicCell = new LogicCell(this, cell, i + k, col + l);
              this.rows[i + k][col + l] = logicCell;
              if (!this.cellMap.has(cell)) {
                this.cellMap.set(cell, []);
              }
              this.cellMap.get(cell).push(logicCell);
              // 记录当前单元格对后续行和列的“侵占”
              if (k > 0 || l > 0) {
                if (!offsets[i + k]) {
                  offsets[i + k] = [];
                }
                offsets[i + k][col + l] = true;
              }
            }
          }
          col += colspan;
        }
      }
    }
    // 根据逻辑定位（行和列）返回逻辑单元格
    cell(row, col) {
      if (row < 0 || row >= this.rows.length || col < 0 || col >= this.rows[0].length) {
        console.log(`Invalid row or col: ${row}, ${col}`);
        return null;
      }
      return this.rows[row][col];
    }

    // 根据逻辑单元格返回其对应的实际单元格
    actualCell(logicCell) {
      if (!logicCell) {
        return null;
      }
      if (!(logicCell instanceof LogicCell)) {
        console.log('Invalid logicCell', logicCell);
        return null;
      }
      return logicCell.cell;
    }

    // 根据实际单元格返回其对应的一个或多个逻辑单元格
    logicCells(cell) {
      if (cell === null) {
        return null;
      }
      if (!this.cellMap.has(cell)) {
        return null;
      }
      return this.cellMap.get(cell);
    }

    // 根据实际单元格返回其对应的左上角逻辑单元格
    logicCell(cell) {
      let cells = this.logicCells(cell);
      if (cells === null || cells.length === 0) {
        return null;
      }
      return cells[0];
    }

    // 获取指定行的单元格
    getCellsInRow(rowIndex, startCol = 0, endCol = null) {
      const row = this.rows[rowIndex];
      endCol = endCol === null ? row.length - 1 : endCol;
      // 如果开始索引大于结束索引，交换它们
      if (startCol > endCol) {
        [startCol, endCol] = [endCol, startCol];
      }
      return row.slice(startCol, endCol + 1);
    }

    // 获取指定列的单元格
    getCellsInColumn(colIndex, startRow = 0, endRow = this.rows.length - 1) {
      let cells = [];
      // 如果开始索引大于结束索引，交换它们
      if (startRow > endRow) {
        [startRow, endRow] = [endRow, startRow];
      }
      for (let i = startRow; i <= endRow; i++) {
        cells.push(this.rows[i][colIndex]);
      }
      return cells;
    }
  }

  // ==========================================
  // 事件处理程序
  // ==========================================
  window.HiTableHandleMouseDown = function(event) {
    let cell = event.target;
    if (event.button === 0 && isSelectableCell(cell)) {
      // 阻止默认的表格选择
      event.preventDefault();
      deselectAllCells(); // 删除所有选择
      clearOverlayTable(); // 清除覆盖表格
      isMouseDown = true;
      originalTable = cell.closest('table');
      logicTable = new LogicTable(originalTable);
      startCell = logicTable.logicCell(cell);
      endCell = startCell;

      if (event.shiftKey && startCell.row === 0 && startCell.col === 0) {
        // 如果在 (0,0) 位置按下 Shift 键，则选择整个表格
        endCell = logicTable.rows[logicTable.totalRows - 1][logicTable.totalCols - 1];
        selectCellsAndFillArray();
      }
    }
  }

  window.HiTableHandleMouseOver = function(event) {
    let cell = event.target;
    if (isMouseDown && isSelectableCell(cell) && 
      cell !== logicTable.actualCell(currentCell)) {
      currentCell = logicTable.logicCell(cell);
      if (event.shiftKey) {
        if (startCell.col === 0 && currentCell.col === 0) {
          // 如果 startCell 和 currentCell 都在第一列，则选择这两个单元格之间的所有行
          endCell = logicTable.rows[currentCell.row][logicTable.totalCols - 1];
        } else if (startCell.row === 0 && currentCell.row === 0) {
          // 如果 startCell 和 currentCell 都在第一行，则选择这两个单元格之间的所有列
          endCell = logicTable.rows[logicTable.totalRows - 1][currentCell.col];
        } else {
          // 否则，选择区域
          endCell = currentCell;
        }
      } else {
        endCell = currentCell;
      }
      // 每当鼠标移动时，先删除所有被选择和高亮的单元格
      deselectAllCells();
      if (!startCell.isSameCell(endCell) && startCell !== null && endCell !== null) {
        // 保证选择过程可见
        selectCellsAndFillArray();
      }
    }
  }

  window.HiTableHandleMouseUp = function(event) {
    let cell = event.target;
    if (isMouseDown && isSelectableCell(cell)) {
      isMouseDown = false;
      if (!startCell.isSameCell(endCell) && startCell !== null && endCell !== null) {
        showOverlay();
        calculation();
      }
    }
  }

  window.HiTableHandleKeyDown = function(event) {
    if (event.key === 'Escape') {
      deselectAllCells();
      clearOverlayTable();
    }

    if (event.key.toLowerCase() === 'c' && (event.ctrlKey || event.metaKey)) {
      let pressCtrlC = Date.now();
      // 复制选中的单元格数据
      let text;
      if (pressCtrlC - lastPressCtrlC < 500) {
        text = '';
        // 如果两次按下 Ctrl+C 的时间间隔小于 500 毫秒，则复制整个覆盖表格的数据
        overlayTable.querySelectorAll('tr').forEach(tr => {
          tr.querySelectorAll('td div').forEach(div => {
            text += div.textContent + '\t';
          });
          text += '\n';
        });
      } else {
        // 如果单次按下或两次按下 Ctrl+C 的时间间隔大于 500 毫秒，则复制选中的单元格数据
        text = selectedCellsData.map(row => row.join('\t')).join('\n') + '\n';
      }

      navigator.clipboard.writeText(text);
      lastPressCtrlC = pressCtrlC;
    }
  }
  function isSelectableCell(cell) {
    return (cell.tagName.toLowerCase() === 'td' || cell.tagName.toLowerCase() === 'th') && 
      !cell.closest('table').classList.contains('HiTableOverlay');
  }

  // ==========================================
  // 初始化，代码入口
  // ==========================================
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
    
    loadConfig().then((newConfig) => {
      // 在这里，loadConfig 已经完成，你可以使用它的结果处理配置值
      // 覆盖全局默认配置
      config = newConfig;
      parseConfig(config);
    }).catch((error) => {
      console.error('Failed to load options', error);
    });
  }

  // ==========================================
  // 配置相关部分
  // ==========================================
  // 异步加载配置
  async function loadConfig() {
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
      return data.HiTable ?? defaultConfig;
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
  // 监听存储变化
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    for (let key in changes) {
      if (key === 'HiTable') {
        loadConfig().then(newConfig => {
          // 更新配置
          // 在这里，loadConfig 已经完成，你可以使用它的结果处理配置值
          // 覆盖默认配置
          config = newConfig;
          parseConfig(config);
        }).catch((error) => {
          console.error('Failed to load options', error);
        });
      }
    }
  });
  // 根据配置值修改样式表
  function parseConfig(config) {
    if (config && config.boxColor) {
      // 检查是否已经存在一个样式表
      let style = document.getElementById('HiTableStyle');
      if (!style) {
        // 如果不存在，创建一个新的样式表
        style = document.createElement('style');
        style.id = 'HiTableStyle';
        document.head.appendChild(style);
      }

      // 将颜色值转换为rgba格式
      let rgbaColor = parseInt(config.boxColor.slice(1, 3), 16) + ', ' + parseInt(config.boxColor.slice(3, 5), 16) + ', ' + parseInt(config.boxColor.slice(5, 7), 16) + ', ';

      style.textContent = `
        .HiTableOverlay-top, .HiTableOverlay-right, .HiTableOverlay-bottom, .HiTableOverlay-left { background-color: rgba(${rgbaColor} 0.6); }
        td[cell-selected="true"], th[cell-selected="true"] { background-color: rgba(${rgbaColor} 1); }
      `;
    }

    if (config && config.algorithm && overlayTable) {
      // 重新计算结果
      calculation();
    }
  }

  // ==========================================
  // 在原表格上选择单元格
  // ==========================================
  // 清除所有被高亮的单元格
  function deselectAllCells() {
    if (originalTable) {
      originalTable.querySelectorAll('[cell-selected], [cell-isNaN]').forEach(cell => {
        cell.removeAttribute('cell-selected');
        cell.removeAttribute('cell-isNaN');
      });
    }
  }
  // 清除覆盖表格
  function clearOverlayTable() {
    if (overlayTable) {
      overlayTable.remove();
      overlayTable = null;
    }
  }
  // 选择单元格并填充数组
  function selectCellsAndFillArray() {

    const [ top, left, bottom, right ] = getSelectedRect();

    selectedCellsData = Array.from({ length: bottom - top + 1 }, (_, r) =>
      Array.from({ length: right - left + 1 }, (_, c) => {
        let cell = logicTable.actualCell(logicTable.cell(top + r, left + c));
        let value = parseNumber(cell.innerText);
        if (isNaN(value)) {
          cell.setAttribute('cell-isNaN', 'true');
        }
        // 高亮单元格
        cell.setAttribute('cell-selected', 'true');
        return value;
      })
    );
  }
  // 解析数字
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
  
  // ==========================================
  // 显示覆盖表格
  // ==========================================
  // 获取矩形选择区的左上角和右下角单元格
  function getSelectedRect() {
    // 选择区域的索引边界
    const [top, bottom] = [startCell.row, endCell.row].sort((a, b) => a - b);
    const [left, right] = [startCell.col, endCell.col].sort((a, b) => a - b);

    return [ top, left, bottom, right ];
  }

  // 显示覆盖表格
  function showOverlay() {
    const [top, left, bottom, right] = getSelectedRect();

    // 计算外延区域的边界
    const topLeft = logicTable.cell(top, left);
    const bottomRight = logicTable.cell(bottom, right);
    const topLeftRect = topLeft.cell.getBoundingClientRect();

    // 选择区域的显示边界
    const leftBound = topLeftRect.left + window.scrollX;
    const topBound = topLeftRect.top + window.scrollY;

    // 获取相邻的外边单元格
    const selectedCells = getSelectedCells(topLeft, bottomRight);

    // 创建覆盖表格并添加单元格
    overlayTable = createOverlayTable(leftBound, topBound, selectedCells.data, true);
    // 为每个单元格添加鼠标悬停事件
    addCrossHighlighted(overlayTable);

    // 扩展覆盖表格
    extendOverlayTable(overlayTable);
    // 取消原表格上的选择区域
    deselectAllCells();
  }

  // 获取选择区域及四边单元格
  function getSelectedCells(start, end) {
    const topRow = logicTable.getCellsInRow(start.row, start.col, end.col);
    const bottomRow = logicTable.getCellsInRow(end.row, start.col, end.col);
    const leftColumn = logicTable.getCellsInColumn(start.col, start.row, end.row);
    const rightColumn = logicTable.getCellsInColumn(end.col, start.row, end.row);
    
    // 获取选择区域的数据
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    
    let data = Array.from({ length: maxRow - minRow + 1 }, (_, i) =>
      logicTable.getCellsInRow(minRow + i, minCol, maxCol)
    ).flat();

    return {
      data,
      topRow,
      bottomRow,
      leftColumn,
      rightColumn
    };
  }

  // 十字高亮
  function addCrossHighlighted(table) {
    table.addEventListener('mouseover', function(event) {
      if (event.target.tagName.toLowerCase() === 'td') {
        const cell = event.target;
        if (cell.classList.contains('HiTableOverlay-top') || cell.classList.contains('HiTableOverlay-bottom') || cell.classList.contains('HiTableOverlay-left') || cell.classList.contains('HiTableOverlay-right')) {
          return;
        }
        // 获取十字单元格
        const crossCells = getCrossCells(cell);
        // 高亮十字单元格
        crossCells.forEach(crossCell => crossCell.setAttribute('cell-highlighted', 'true'));
      }
    });

    table.addEventListener('mouseout', function(event) {
      if (event.target.tagName.toLowerCase() === 'td' &&
        // 如果相关元素是单元格的子元素，那么忽略这个 mouseout 事件
        !event.target.contains(event.relatedTarget)) {
        // 清除所有单元格的状态
        document.querySelectorAll('.HiTableOverlay td').forEach(cell => cell.removeAttribute('cell-highlighted'));
      }
    });
  }

  // 获取十字单元格
  function getCrossCells(cell) {
    const table = cell.closest('table'); // 获取 cell 所在的表格
    const crossCells = [];
  
    // 获取当前单元格的行和列
    const row = cell.parentNode.rowIndex;
    const col = cell.cellIndex;
  
    // 获取当前行的所有单元格
    const rowCells = Array.from(table.rows[row].cells);
    crossCells.push(...rowCells);
  
    // 获取当前列的所有单元格
    const colCells = Array.from(table.rows).map(row => row.cells[col] || null);
    crossCells.push(...colCells);
  
    return crossCells;
  }

  // 创建覆盖表格并添加单元格
  function createOverlayTable(left, top, cells = [], withContent = false) {
    if (overlayTable && document.body.contains(overlayTable)) {
      document.body.removeChild(overlayTable);
    }
    // 创建一个新的表格
    overlayTable = document.createElement('table');

    // 获取原表格的样式
    const style = window.getComputedStyle(originalTable);

    // 添加必要的类
    overlayTable.classList.add('HiTableOverlay');

    // 设置必要的样式
    overlayTable.style.borderSpacing = style.borderSpacing; // 设置边线间距
    overlayTable.style.borderCollapse = style.borderCollapse; // 设置边线合并
    overlayTable.style.padding = style.padding; // 设置内边距
    overlayTable.style.border = style.border; // 设置边线样式

    document.body.appendChild(overlayTable);

    appendToTable(overlayTable, copyCells(cells, withContent));
    
    overlayTable.style.left = `${left}px`;
    overlayTable.style.top = `${top}px`;

    return overlayTable;
  }
  
  function copyCells(cells, withContent = false) {
    const copiedCells = [];
    let prevCell = null;
    let tr = null;

    cells.forEach((cell, index) => {
      const clone = copyCell(cell, withContent);
      if (clone !== null) {
        // 如果当前单元格与前一个单元格不在同一行，那么创建一个新的行
        if (!prevCell || cell.row !== prevCell.row) {
          tr = document.createElement('tr');
          copiedCells.push(tr);
        }
        tr.appendChild(clone);
        prevCell = cell;
      } else if (prevCell !== null) {
        // 如果当前单元格为空，那么将前一个单元格的 colSpan 加 1
        prevCell.colSpan = (prevCell.colSpan || 1) + 1;
      }
    });

    return copiedCells;
  }

  // 复制单元格
  function copyCell(cell, withContent = false) {
    if (cell === null) {
      return null;
    }
    const actualCell = logicTable.actualCell(cell);

    // 获取原单元格的样式
    const style = window.getComputedStyle(actualCell);
    const paddingTop = parseFloat(style.paddingTop);
    const paddingRight = parseFloat(style.paddingRight);
    const paddingBottom = parseFloat(style.paddingBottom);
    const paddingLeft = parseFloat(style.paddingLeft);
    const borderWidth = parseFloat(style.borderWidth); // 获取单元格边线宽度
    const borderStyle = style.borderStyle; // 获取单元格边线样式

    const borderCollapse = window.getComputedStyle(logicTable.originalTable).borderCollapse; // 获取表格的边框样式
    const borderWidthToSubtract = borderCollapse === 'collapse' ? borderWidth : 2 * borderWidth; // 如果边框合并，只减去一个边框宽度，否则减去两个

    const newCell = document.createElement('td');
    newCell.style.padding = `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`;
    newCell.style.borderWidth = `${borderWidth}px`; // 设置复制的单元格的边线宽度
    newCell.style.borderStyle = borderStyle; // 设置复制的单元格的边线样式
    newCell.setAttribute('cell-selected', true);
    if (withContent && actualCell.getAttribute('cell-isNaN')) {
      newCell.setAttribute('cell-isNaN', actualCell.getAttribute('cell-isNaN'));
    }

    const div = document.createElement('div');
    div.style.width = `${cell.width() - paddingLeft - paddingRight - borderWidthToSubtract}px`; // 考虑边线宽度
    div.style.height = `${cell.height() - paddingTop - paddingBottom - borderWidthToSubtract}px`; // 考虑边线宽度
    if (withContent) {
      div.innerText = actualCell.innerText;
    }
    newCell.appendChild(div);
    return newCell;
  }

  // 添加行到表格
  function appendToTable(table, cells) {
      cells.forEach((tr) => table.appendChild(tr));
  }

  // 扩展覆盖表格
  function extendOverlayTable(overlayTable) {
    if (! overlayTable) {
      return false;
    }
    // 复制表格第一行，并插入到表格第一行前
    const firstRow = overlayTable.rows[0];
    const newRow = firstRow.cloneNode(true);
    Array.from(newRow.cells).forEach(cell => cell.classList.add('HiTableOverlay-top'));
    overlayTable.insertBefore(newRow, firstRow);

    // 复制表格最后一行，并插入到表格最后一行后
    const lastRow = overlayTable.rows[overlayTable.rows.length - 1];
    const newLastRow = lastRow.cloneNode(true);
    Array.from(newLastRow.cells).forEach(cell => cell.classList.add('HiTableOverlay-bottom'));
    overlayTable.appendChild(newLastRow);

    // 复制表格第一列，并插入到表格第一列前
    const newFirstCol = Array.from(overlayTable.rows, row => row.cells[0].cloneNode(true));

    newFirstCol.forEach((cell, index) => {
      cell.classList.add('HiTableOverlay-left');
      overlayTable.rows[index].insertBefore(cell, overlayTable.rows[index].cells[0]);
    });

    // 复制表格最后一列，并插入到表格最后一列后
    const newLastCol = Array.from(overlayTable.rows, row => row.cells[row.cells.length - 1].cloneNode(true));

    newLastCol.forEach((cell, index) => {
      cell.classList.add('HiTableOverlay-right');
      overlayTable.rows[index].appendChild(cell);
    });

    // 移除属性
    const overlayCells = overlayTable.querySelectorAll('.HiTableOverlay-top, .HiTableOverlay-bottom, .HiTableOverlay-left, .HiTableOverlay-right');
    overlayCells.forEach(cell => {
      cell.removeAttribute('cell-selected');
      cell.removeAttribute('cell-isnan');
    });

    const leftRightCells = overlayTable.querySelectorAll('.HiTableOverlay-left div, .HiTableOverlay-right div');
    leftRightCells.forEach(div => {
      div.style.maxWidth = div.style.width;
      div.style.width = 'auto';
    });

    // 获取覆盖表格当前的 left 和 top 值
    const currentLeft = parseInt(overlayTable.style.left, 10);
    const currentTop = parseInt(overlayTable.style.top, 10);

    // 重新定位覆盖表格，使之与原表格重叠
    const topLeftCell = overlayTable.rows[0].cells[0];
    const cellWidth = topLeftCell.offsetWidth;
    const cellHeight = topLeftCell.offsetHeight;

    // 移动覆盖表格
    overlayTable.style.left = `${currentLeft - cellWidth}px`;
    overlayTable.style.top = `${currentTop - cellHeight}px`;

    for (let i = 0; i < directions.length; i++) {
      const direction = directions[i];
      const corner = getCorner(overlayTable, direction);
      // 设置事件处理程序
      corner.addEventListener('mouseover', () => highlightOverlayTable(direction, true));
      corner.addEventListener('mouseout', () => highlightOverlayTable(direction, false));
      corner.addEventListener('click', cornerClick(direction));
    }
  }
  // 根据边获得其控制角
  function getCorner(overlayTable, direction) {
    // 获取当前方向在 directions 数组中的索引
    const index = directions.indexOf(direction);

    // 获取逆时针方向
    const prevDirection = directions[(index + 3) % 4];

    // 获取角单元格
    const corner = overlayTable.querySelector(`.HiTableOverlay-${direction}.HiTableOverlay-${prevDirection}`);

    return corner;
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

  // 高亮覆盖表格
  function highlightOverlayTable(direction, highlight) {
    const cells = overlayTable.querySelectorAll(`td.HiTableOverlay-${direction}, th.HiTableOverlay-${direction}`);
    if (cells) {
      cells.forEach((td, index) => {
        if (index > 0 && index < cells.length - 1) {
          if (highlight) {
            td.setAttribute('cell-highlighted', 'true');
          } else {
            td.removeAttribute('cell-highlighted');
          }
        }
      });
    }
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
    for (let i = 0; i < directions.length; i++) {
      const direction = directions[i];
      const corner = getCorner(overlayTable, direction);
      let algorithm = config.algorithm[direction];
      if (corner) {
        const div = corner.querySelector('div');
        if (div) {
          div.textContent = algorithm;
        }
      }
      
      // 如果提供了 targetDirection 和 targetAlgorithm，那么只计算指定的边的指定算法
      if (targetDirection && targetAlgorithm) {
        if (direction === targetDirection) {
          algorithm = targetAlgorithm;
        } else {
          continue;
        }
      }

      const cells = overlayTable.querySelectorAll(`.HiTableOverlay-${direction}`);
      if (cells) {
        cells.forEach((td, index) => {
          // 排除两端的角
          if (index > 0 && index < cells.length - 1) {
            const div = td.querySelector('div');
            let value;
            let title;

            if (algorithm) {
              const isColumn = direction === 'top' || direction === 'bottom';
              const data = isColumn ? selectedCellsData.map(row => row[index - 1]) : selectedCellsData[index - 1];
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
          }
        });
      }

    }
  }
})();