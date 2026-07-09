(function() {
  // 检查扩展上下文是否有效
  try {
    if (!chrome.runtime?.id) {
      console.log('HiTable: Extension context not available, skipping initialization');
      return;
    }
  } catch (e) {
    return;
  }

  // 防止重复初始化
  if (window.HiTableInitialized) {
    console.log('HiTable already initialized, skipping...');
    return;
  }
  window.HiTableInitialized = true;

  // ==========================================
  // 常量配置
  // ==========================================
  const CONSTANTS = {
    // CSS 类名
    CSS: {
      OVERLAY: 'HiTableOverlay',
      OVERLAY_TOP: 'HiTableOverlay-top',
      OVERLAY_RIGHT: 'HiTableOverlay-right',
      OVERLAY_BOTTOM: 'HiTableOverlay-bottom',
      OVERLAY_LEFT: 'HiTableOverlay-left',
      STYLE_ID: 'HiTableStyle'
    },
    // DOM 属性
    ATTRS: {
      CELL_SELECTED: 'cell-selected',
      CELL_HIGHLIGHTED: 'cell-highlighted',
      EDGE_HIGHLIGHTED: 'edge-highlighted',
      CELL_ISNAN: 'cell-isNaN'
    },
    // 性能相关
    PERF: {
      THROTTLE_MS: 16,  // 约 60fps
      DOUBLE_CLICK_MS: 500  // 双击 Ctrl+C 的时间间隔
    },
    // 选择器
    SELECTORS: {
      OVERLAY_EDGES: '.HiTableOverlay-top, .HiTableOverlay-right, .HiTableOverlay-bottom, .HiTableOverlay-left',
      SELECTED_CELLS: '[cell-selected], [cell-isNaN]'
    }
  };

  // ==========================================
  // 类定义：逻辑单元格
  // ==========================================

  /**
   * 逻辑单元格类 - 表示逻辑表格中的一个单元格
   */
  class LogicCell {
    /** @type {number[]} 保存每一列的宽度缓存（静态，跨实例共享） */
    static colWidths = [];
    /** @type {number[]} 保存每一行的高度缓存（静态，跨实例共享） */
    static rowHeights = [];

    /**
     * 清除所有缓存（在创建新的 LogicTable 时调用）
     */
    static clearAllCache() {
      LogicCell.colWidths = [];
      LogicCell.rowHeights = [];
    }

    /**
     * @param {LogicTable} table - 所属的逻辑表格
     * @param {HTMLTableCellElement} cell - 对应的 DOM 单元格
     * @param {number} row - 逻辑行索引
     * @param {number} col - 逻辑列索引
     */
    constructor(table, cell, row, col) {
      /** @type {LogicTable} */
      this.table = table;
      /** @type {HTMLTableCellElement} */
      this.cell = cell;
      /** @type {number} */
      this.row = row;
      /** @type {number} */
      this.col = col;
    }

    /**
     * 判断是否与另一个逻辑单元格引用同一个 DOM 单元格
     */
    isSameCell(other) {
      if (!other) return false;
      return this.cell === other.cell;
    }

    /**
     * 判断是否与另一个逻辑单元格在同一逻辑位置
     */
    isSamePosition(other) {
      if (!other) return false;
      return this.row === other.row && this.col === other.col;
    }

    /**
     * 获取单元格所在列的宽度（带缓存）
     */
    width() {
      if (LogicCell.colWidths[this.col]) {
        return LogicCell.colWidths[this.col];
      }

      let width = 0;
      if (this.cell.colSpan === 1) {
        width = this.cell.offsetWidth;
      } else {
        for (let row = 0; row < this.table.rows.length; row++) {
          let logicCell = this.table.rows[row][this.col];
          if (logicCell && logicCell.cell.colSpan === 1) {
            width = logicCell.cell.offsetWidth;
            break;
          }
        }
        if (width === 0) {
          width = this.cell.offsetWidth / this.cell.colSpan;
        }
      }
      
      LogicCell.colWidths[this.col] = width;
      return width;
    }

    /**
     * 获取单元格所在行的高度（带缓存）
     */
    height() {
      if (LogicCell.rowHeights[this.row]) {
        return LogicCell.rowHeights[this.row];
      }

      let height = 0;
      if (this.cell.rowSpan === 1) {
        height = this.cell.offsetHeight;
      } else {
        let rowCells = this.table.rows[this.row];
        if (rowCells) {
          for (let col = 0; col < rowCells.length; col++) {
            let logicCell = rowCells[col];
            if (logicCell && logicCell.cell.rowSpan === 1) {
              height = logicCell.cell.offsetHeight;
              break;
            }
          }
        }
        if (height === 0) {
          height = this.cell.offsetHeight / this.cell.rowSpan;
        }
      }
      
      LogicCell.rowHeights[this.row] = height;
      return height;
    }
  }

  // ==========================================
  // 类定义：逻辑表格
  // ==========================================

  /**
   * 逻辑表格类 - 将 HTML 表格转换为扁平化的逻辑表格结构
   */
  class LogicTable {
    /**
     * @param {HTMLTableElement} table - 原始 HTML 表格元素
     */
    constructor(table) {
      LogicCell.clearAllCache();

      /** @type {HTMLTableElement|Element} */
      this.originalTable = table;
      /** @type {LogicCell[][]} 逻辑表格二维数组 */
      this.rows = [];
      /** @type {WeakMap<HTMLTableCellElement, LogicCell[]>} DOM 单元格到逻辑单元格的映射 */
      this.cellMap = new WeakMap();
      /** @type {number} */
      this.totalRows = 0;
      /** @type {number} */
      this.totalCols = 0;

      // 如果是非标准表格容器，使用 grid 模式
      if (table.hasAttribute && table.hasAttribute('data-hitable-grid')) {
        this._generateFromGrid();
      } else {
        this._generate();
      }
    }

    // ==========================================
    // 私有方法：嵌套表格检测
    // ==========================================

    /**
     * 检查单元格是否包含嵌套表格
     */
    _getNestedTable(cell) {
      let table = cell.querySelector(':scope > table');
      if (table) return table;
      
      let tables = cell.querySelectorAll('table');
      if (tables.length === 1) {
        let table = tables[0];
        let cellText = cell.textContent.trim();
        let tableText = table.textContent.trim();
        if (cellText === tableText) {
          return table;
        }
      }
      return null;
    }

    // ==========================================
    // 核心算法：自顶向下展开
    // ==========================================

    /**
     * 从非标准表格容器生成逻辑表格（替代 _generate）
     * @private
     */
    _generateFromGrid() {
      const gridData = window.HiTableGridDetector?.buildGridFromContainer(this.originalTable);
      if (!gridData || !gridData.rows.length) {
        console.warn('HiTable: Failed to build grid from container');
        this.totalRows = 0;
        this.totalCols = 0;
        return;
      }

      this.totalRows = gridData.rows.length;
      this.totalCols = gridData.rows.reduce((max, row) => Math.max(max, row.length), 0);

      for (let r = 0; r < gridData.rows.length; r++) {
        this.rows[r] = [];
        for (let c = 0; c < gridData.rows[r].length; c++) {
          const domCell = gridData.rows[r][c];
          if (domCell) {
            const logicCell = new LogicCell(this, domCell, r, c);
            this.rows[r][c] = logicCell;

            if (!this.cellMap.has(domCell)) {
              this.cellMap.set(domCell, []);
            }
            this.cellMap.get(domCell).push(logicCell);
          } else {
            this.rows[r][c] = null;
          }
        }
        // 补齐列数不足的行
        for (let c = gridData.rows[r].length; c < this.totalCols; c++) {
          this.rows[r][c] = null;
        }
      }

      // console.log('HiTable: Grid-based LogicTable generated:', this.totalRows, 'x', this.totalCols);
    }

    /**
     * 生成逻辑表格结构
     * @private
     */
    _generate() {
      // 第一步：构建初始网格（处理 rowspan/colspan）
      let grid = this._buildInitialGrid(this.originalTable);
      
      // 第二步：迭代展开嵌套表格
      grid = this._expandNestedTables(grid);
      
      // 第三步：转换为 LogicCell 并填充 this.rows 和 cellMap
      this._finalizeGrid(grid);
      
      // 调试输出
      // console.log('LogicTable generated:', this.totalRows, 'x', this.totalCols);
    }

    /**
     * 构建初始网格：处理 rowspan 和 colspan，每个位置存储 DOM 单元格引用
     * @param {HTMLTableElement} table
     * @returns {HTMLTableCellElement[][]} 二维数组，每个位置是 DOM 单元格
     */
    _buildInitialGrid(table) {
      let grid = [];
      let rowCount = table.rows.length;
      
      for (let i = 0; i < rowCount; i++) {
        let tr = table.rows[i];
        if (!grid[i]) grid[i] = [];
        
        let colIndex = 0;
        
        for (let j = 0; j < tr.cells.length; j++) {
          let cell = tr.cells[j];
          let rowspan = cell.rowSpan || 1;
          let colspan = cell.colSpan || 1;
          
          // 跳过已被占用的位置
          while (grid[i][colIndex] !== undefined) {
            colIndex++;
          }
          
          // 填充此单元格占用的所有位置
          for (let r = 0; r < rowspan; r++) {
            for (let c = 0; c < colspan; c++) {
              let targetRow = i + r;
              let targetCol = colIndex + c;
              if (!grid[targetRow]) grid[targetRow] = [];
              grid[targetRow][targetCol] = cell;
            }
          }
          
          colIndex += colspan;
        }
      }
      
      return grid;
    }

    /**
     * 迭代展开所有嵌套表格
     * @param {HTMLTableCellElement[][]} grid
     * @returns {HTMLTableCellElement[][]} 展开后的网格
     */
    _expandNestedTables(grid) {
      let hasNested = true;
      
      // 循环直到没有嵌套表格
      while (hasNested) {
        hasNested = false;
        
        // 扫描网格，找到需要展开的单元格
        for (let r = 0; r < grid.length; r++) {
          for (let c = 0; c < grid[r].length; c++) {
            let cell = grid[r][c];
            if (!cell) continue;
            
            // 检查这个位置是否是该单元格的"起始位置"
            // （避免对同一个合并单元格多次处理）
            if (r > 0 && grid[r-1][c] === cell) continue;
            if (c > 0 && grid[r][c-1] === cell) continue;
            
            let nestedTable = this._getNestedTable(cell);
            if (nestedTable) {
              hasNested = true;
              
              // 计算此单元格当前占用的区域
              let cellSpan = this._getCellSpanInGrid(grid, r, c, cell);
              
              // 构建嵌套表格的网格
              let nestedGrid = this._buildInitialGrid(nestedTable);
              let nestedRows = nestedGrid.length;
              let nestedCols = nestedGrid[0]?.length || 1;
              
              // 展开网格
              grid = this._expandGridForNested(grid, r, c, cellSpan, nestedGrid, nestedRows, nestedCols);
              
              // 重新开始扫描（因为索引已变化）
              r = 0;
              c = -1; // 会被 c++ 变成 0
              break;
            }
          }
        }
      }
      
      return grid;
    }

    /**
     * 获取单元格在网格中的跨度
     */
    _getCellSpanInGrid(grid, startRow, startCol, cell) {
      let rowSpan = 0;
      let colSpan = 0;
      
      // 计算行跨度
      for (let r = startRow; r < grid.length && grid[r][startCol] === cell; r++) {
        rowSpan++;
      }
      
      // 计算列跨度
      for (let c = startCol; c < grid[startRow].length && grid[startRow][c] === cell; c++) {
        colSpan++;
      }
      
      return { rowSpan, colSpan };
    }

    /**
     * 展开网格以容纳嵌套表格
     */
    _expandGridForNested(grid, startRow, startCol, cellSpan, nestedGrid, nestedRows, nestedCols) {
      let { rowSpan: currentRowSpan, colSpan: currentColSpan } = cellSpan;
      
      // 计算需要增加的行数和列数
      let rowsToAdd = Math.max(0, nestedRows - currentRowSpan);
      let colsToAdd = Math.max(0, nestedCols - currentColSpan);
      
      // 如果需要增加列
      if (colsToAdd > 0) {
        grid = this._insertColumns(grid, startCol + currentColSpan, colsToAdd, startRow, startRow + currentRowSpan);
      }
      
      // 如果需要增加行
      if (rowsToAdd > 0) {
        grid = this._insertRows(grid, startRow + currentRowSpan, rowsToAdd, startCol, startCol + currentColSpan + colsToAdd);
      }
      
      // 填充嵌套表格的内容
      for (let r = 0; r < nestedRows; r++) {
        for (let c = 0; c < nestedCols; c++) {
          let targetRow = startRow + r;
          let targetCol = startCol + c;
          if (nestedGrid[r] && nestedGrid[r][c]) {
            grid[targetRow][targetCol] = nestedGrid[r][c];
          }
        }
      }
      
      return grid;
    }

    /**
     * 在网格中插入列，并复制受影响区域外的单元格
     */
    _insertColumns(grid, insertAt, count, affectedRowStart, affectedRowEnd) {
      for (let r = 0; r < grid.length; r++) {
        let row = grid[r];
        let isAffectedRow = (r >= affectedRowStart && r < affectedRowEnd);
        
        // 在 insertAt 位置插入 count 个单元格
        let cellToCopy = row[insertAt - 1]; // 要复制的单元格（插入位置左边的单元格）
        let newCells = [];
        
        for (let i = 0; i < count; i++) {
          if (isAffectedRow) {
            // 受影响的行：先留空，稍后由嵌套表格填充
            newCells.push(null);
          } else {
            // 非受影响的行：复制左边的单元格
            newCells.push(cellToCopy);
          }
        }
        
        row.splice(insertAt, 0, ...newCells);
      }
      
      return grid;
    }

    /**
     * 在网格中插入行，并复制受影响区域外的单元格
     */
    _insertRows(grid, insertAt, count, affectedColStart, affectedColEnd) {
      let colCount = grid[0]?.length || 0;
      
      for (let i = 0; i < count; i++) {
        let newRow = [];
        let rowToCopy = grid[insertAt - 1]; // 要复制的行（插入位置上面的行）
        
        for (let c = 0; c < colCount; c++) {
          let isAffectedCol = (c >= affectedColStart && c < affectedColEnd);
          
          if (isAffectedCol) {
            // 受影响的列：先留空，稍后由嵌套表格填充
            newRow.push(null);
          } else {
            // 非受影响的列：复制上面的单元格
            newRow.push(rowToCopy ? rowToCopy[c] : null);
          }
        }
        
        grid.splice(insertAt + i, 0, newRow);
      }
      
      return grid;
    }

    /**
     * 将网格转换为最终的 LogicCell 结构
     */
    _finalizeGrid(grid) {
      this.totalRows = grid.length;
      this.totalCols = grid[0]?.length || 0;
      
      for (let r = 0; r < grid.length; r++) {
        this.rows[r] = [];
        for (let c = 0; c < (grid[r]?.length || 0); c++) {
          let domCell = grid[r][c];
          if (domCell) {
            let logicCell = new LogicCell(this, domCell, r, c);
            this.rows[r][c] = logicCell;
            
            // 更新 cellMap
            if (!this.cellMap.has(domCell)) {
              this.cellMap.set(domCell, []);
            }
            this.cellMap.get(domCell).push(logicCell);
          } else {
            this.rows[r][c] = null;
          }
        }
      }
    }

    // ==========================================
    // 公共方法：查询
    // ==========================================

    /**
     * 根据逻辑位置返回逻辑单元格
     */
    cell(row, col) {
      if (row < 0 || row >= this.rows.length) {
        return null;
      }
      if (col < 0 || !this.rows[row] || col >= this.rows[row].length) {
        return null;
      }
      return this.rows[row][col];
    }

    /**
     * 根据逻辑单元格返回对应的 DOM 单元格
     */
    actualCell(logicCell) {
      if (!logicCell || !(logicCell instanceof LogicCell)) {
        return null;
      }
      return logicCell.cell;
    }

    /**
     * 根据 DOM 单元格返回其对应的所有逻辑单元格
     */
    logicCells(cell) {
      if (!cell || !this.cellMap.has(cell)) {
        return null;
      }
      return this.cellMap.get(cell);
    }

    /**
     * 根据 DOM 单元格返回其对应的左上角逻辑单元格
     */
    logicCell(cell) {
      let cells = this.logicCells(cell);
      if (!cells || cells.length === 0) {
        return null;
      }
      return cells[0];
    }

    /**
     * 获取指定行的单元格
     */
    getCellsInRow(rowIndex, startCol = 0, endCol = null) {
      if (rowIndex < 0 || rowIndex >= this.rows.length) {
        return [];
      }
      const row = this.rows[rowIndex];
      endCol = endCol === null ? row.length - 1 : endCol;
      if (startCol > endCol) {
        [startCol, endCol] = [endCol, startCol];
      }
      return row.slice(startCol, endCol + 1);
    }

    /**
     * 获取指定列的单元格
     */
    getCellsInColumn(colIndex, startRow = 0, endRow = null) {
      endRow = endRow === null ? this.rows.length - 1 : endRow;
      if (startRow > endRow) {
        [startRow, endRow] = [endRow, startRow];
      }
      let cells = [];
      for (let i = startRow; i <= endRow; i++) {
        if (this.rows[i] && this.rows[i][colIndex]) {
          cells.push(this.rows[i][colIndex]);
        }
      }
      return cells;
    }
  }

  // ==========================================
  // 辅助函数：获取最外层表格
  // ==========================================

  /**
   * 获取包含给定元素的最外层表格
   */
  function getOutermostTable(element) {
    // 检查是否在非标准表格容器内
    const gridContainer = element.closest('[data-hitable-grid]');
    if (gridContainer) {
      return gridContainer;
    }
    let table = element.closest('table');
    if (!table) return null;
    
    let parentTable = table.parentElement?.closest('table');
    while (parentTable) {
      if (parentTable.classList.contains('HiTableOverlay')) {
        break;
      }
      table = parentTable;
      parentTable = table.parentElement?.closest('table');
    }
    
    return table;
  }

  // ==========================================
  // 全局变量（暴露到 window 以便在停用时清理）
  // ==========================================
  window.HiTableState = {
    config: {},
    startCell: null,
    endCell: null,
    originalTable: null,
    logicTable: null,
    currentCell: null,
    isMouseDown: false,
    selectedCellsData: [],
    overlayTable: null,
    lastPressCtrlC: 0,
    storageChangeListener: null
  };

  // 本地引用，方便使用
  let config = window.HiTableState.config;
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

  // ==========================================
  // 工具函数：throttle 和 debounce
  // ==========================================
  
  /**
   * 节流函数：限制函数在指定时间间隔内只执行一次
   * @param {Function} fn - 要执行的函数
   * @param {number} wait - 等待时间（毫秒）
   * @returns {Function} 节流后的函数
   */
  function throttle(fn, wait) {
    let lastTime = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastTime >= wait) {
        lastTime = now;
        return fn.apply(this, args);
      }
    };
  }

  /**
   * 防抖函数：延迟执行直到事件停止触发
   * @param {Function} fn - 要执行的函数
   * @param {number} wait - 等待时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  function debounce(fn, wait) {
    let timer = null;
    return function(...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(this, args);
      }, wait);
    };
  }

  /**
   * 检查扩展上下文是否仍然有效
   * @returns {boolean} 上下文是否有效
   */
  function isExtensionContextValid() {
    try {
      // 尝试访问 chrome.runtime.id，如果上下文无效会抛出错误
      return !!chrome.runtime?.id;
    } catch (e) {
      return false;
    }
  }

  /**
   * 统一错误处理函数
   * @param {string} context - 错误发生的上下文描述
   * @param {Error} error - 错误对象
   */
  function handleError(context, error) {
    // 如果是上下文失效错误，静默处理（扩展已被重载）
    if (error?.message?.includes('Extension context invalidated')) {
      return;
    }
    console.error(`HiTable [${context}]:`, error.message || error);
    // 可以在这里添加更多错误处理逻辑，如上报错误等
  }

  /**
   * 安全执行函数包装器
   * @param {Function} fn - 要执行的函数
   * @param {string} context - 错误上下文
   * @returns {Function} 包装后的安全函数
   */
  function safeExecute(fn, context) {
    return function(...args) {
      try {
        return fn.apply(this, args);
      } catch (error) {
        handleError(context, error);
      }
    };
  }

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
    MOD: chrome.i18n.getMessage('algorithmNameMOD'),
    Q1: chrome.i18n.getMessage('algorithmNameQ1'),
    Q3: chrome.i18n.getMessage('algorithmNameQ3'),
    IQR: chrome.i18n.getMessage('algorithmNameIQR'),
    SKW: chrome.i18n.getMessage('algorithmNameSKW'),
    KUR: chrome.i18n.getMessage('algorithmNameKUR'),
  };

  // 所有可用的算法列表
  const ALL_ALGORITHMS = ['CNT', 'SUM', 'AVG', 'MIN', 'MAX', 'MED', 'VAR', 'STD', 'RNG', 'MOD', 'Q1', 'Q3', 'IQR', 'SKW', 'KUR'];
  
  // 默认启用的算法（基础统计 + 高级统计）
  const DEFAULT_ENABLED_ALGORITHMS = ['CNT', 'SUM', 'AVG', 'MIN', 'MAX', 'RNG', 'MED', 'STD', 'VAR', 'MOD'];
  // ==========================================
  // 事件处理程序
  // ==========================================
  window.HiTableHandleMouseDown = function(event) {
    try {
      let cell = event.target;
      if (event.button === 0 && isSelectableCell(cell)) {
        // 阻止默认的表格选择
        event.preventDefault();
        event.stopPropagation();
        deselectAllCells(); // 删除所有选择
        clearOverlayTable(); // 清除覆盖表格
        isMouseDown = true;
        // 获取最外层表格，以便展平所有嵌套表格
        originalTable = getOutermostTable(cell);
        logicTable = new LogicTable(originalTable);
        startCell = logicTable.logicCell(cell);
        endCell = startCell;

        if (event.shiftKey && startCell && startCell.row === 0 && startCell.col === 0) {
          // 如果在 (0,0) 位置按下 Shift 键，则选择整个表格
          endCell = logicTable.rows[logicTable.totalRows - 1][logicTable.totalCols - 1];
          selectCellsAndFillArray();
        }
      }
    } catch (error) {
      handleError('MouseDown', error);
      isMouseDown = false;
    }
  }

  window.HiTableHandleMouseOver = function(event) {
    try {
      let cell = event.target;
      if (isMouseDown && logicTable && isSelectableCell(cell) && 
        cell !== logicTable.actualCell(currentCell)) {
        currentCell = logicTable.logicCell(cell);
        if (event.shiftKey && startCell && currentCell) {
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
        if (startCell && endCell && !startCell.isSameCell(endCell)) {
          // 保证选择过程可见
          selectCellsAndFillArray();
        }
      }
    } catch (error) {
      handleError('MouseOver', error);
    }
  }

  window.HiTableHandleMouseUp = function(event) {
    try {
      let cell = event.target;
      if (isMouseDown && isSelectableCell(cell)) {
        isMouseDown = false;
        if (startCell && endCell && !startCell.isSameCell(endCell)) {
          showOverlay();
          calculation();
        }
      }
    } catch (error) {
      handleError('MouseUp', error);
      isMouseDown = false;
    }
  }

  window.HiTableHandleKeyDown = function(event) {
    try {
      if (event.key === 'Escape') {
        deselectAllCells();
        clearOverlayTable();
      }

      if (event.key.toLowerCase() === 'c' && (event.ctrlKey || event.metaKey)) {
        let pressCtrlC = Date.now();
        // 复制选中的单元格数据
        let text;
        if (pressCtrlC - lastPressCtrlC < CONSTANTS.PERF.DOUBLE_CLICK_MS && overlayTable) {
          text = '';
          // 如果两次按下 Ctrl+C 的时间间隔小于阈值，则复制整个覆盖表格的数据
          overlayTable.querySelectorAll('tr').forEach(tr => {
            tr.querySelectorAll('td div').forEach(div => {
              text += div.textContent + '\t';
            });
            text += '\n';
          });
        } else if (selectedCellsData && selectedCellsData.length > 0) {
          // 如果单次按下或时间间隔大于阈值，则复制选中的单元格数据
          text = selectedCellsData.map(row => row.join('\t')).join('\n') + '\n';
        }

        if (text) {
          navigator.clipboard.writeText(text);
        }
        lastPressCtrlC = pressCtrlC;
      }
    } catch (error) {
      handleError('KeyDown', error);
    }
  }
  function isSelectableCell(cell) {
    if (!cell || !cell.tagName) {
      return false;
    }
    const tagName = cell.tagName.toLowerCase();
    if (tagName !== 'td' && tagName !== 'th') {
      // 检查是否为 grid-detector 标记的单元格
      if (cell.hasAttribute('data-hitable-cell')) {
        return true;
      }
      return false;
    }
    const table = cell.closest('table');
    if (!table) {
      return false;
    }
    return !table.classList.contains('HiTableOverlay');
  }

  // ==========================================
  // 初始化，代码入口
  // ==========================================
  init();

  // 初始化
  function init() {
    try {
      document.addEventListener('mousedown', window.HiTableHandleMouseDown);
      document.addEventListener('mouseover', window.HiTableHandleMouseOver);
      document.addEventListener('mouseup', window.HiTableHandleMouseUp);
      document.addEventListener('keydown', window.HiTableHandleKeyDown);

      // 引入外部样式表
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('../assets/main.css');
      link.id = 'HiTableCSS'; // Add an ID to the link element
      (document.head || document.documentElement).appendChild(link);
      
      loadConfig().then((newConfig) => {
        // 在这里，loadConfig 已经完成，你可以使用它的结果处理配置值
        // 覆盖全局默认配置
        config = newConfig;
        parseConfig(config);
        // 初始化非标准表格检测
        activateGridDetector();
      }).catch((error) => {
        handleError('loadConfig', error);
        // 使用默认配置
        parseConfig(config);
        activateGridDetector();
      });
    } catch (error) {
      handleError('init', error);
    }
  }

  /**
   * 初始化非标准表格检测
   */
  function activateGridDetector() {
    if (!window.HiTableGridDetector) return;
    try {
      const grids = window.HiTableGridDetector.findGrids(document.body);
      if (grids.length > 0) {
        // console.log('HiTable: Found', grids.length, 'non-standard grid(s)');
        grids.forEach((grid, index) => {
          grid.container.setAttribute('data-hitable-grid', index);
          grid.rows.forEach(row => {
            row.forEach(cell => {
              cell.setAttribute('data-hitable-cell', 'true');
            });
          });
        });
      }
    } catch (e) {
      handleError('gridDetector', e);
    }
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
      },
      enabledAlgorithms: DEFAULT_ENABLED_ALGORITHMS,
      conditionalFormatting: {
        enabled: true
      }
    };

    // 从Chrome的存储中读取配置值
    try {
      const data = await getStorageData('HiTable');
      // 获取配置值
      return data.HiTable ?? defaultConfig;
    } catch (error) {
      handleError('getConfig', error);
    }
  }
  // 从 Chrome 存储中获取数据
  function getStorageData(key) {
    return new Promise((resolve, reject) => {
      // 检查扩展上下文是否仍然有效
      if (!isExtensionContextValid()) {
        reject(new Error('Extension context invalidated'));
        return;
      }
      chrome.storage.sync.get(key, function(data) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data);
        }
      });
    });
  }
  // 监听存储变化（保存引用以便移除）
  window.HiTableState.storageChangeListener = function(changes, namespace) {
    // 检查扩展上下文是否仍然有效
    if (!isExtensionContextValid()) {
      return;
    }
    for (let key in changes) {
      if (key === 'HiTable') {
        loadConfig().then(newConfig => {
          // 更新配置
          // 在这里，loadConfig 已经完成，你可以使用它的结果处理配置值
          // 覆盖默认配置
          config = newConfig;
          window.HiTableState.config = newConfig;
          parseConfig(config);
        }).catch((error) => {
          handleError('storageChange', error);
        });
      }
    }
  };
  chrome.storage.onChanged.addListener(window.HiTableState.storageChangeListener);
  // 根据配置值修改样式表
  function parseConfig(config) {
    if (config && config.boxColor) {
      // 检查是否已经存在一个样式表
      let style = document.getElementById(CONSTANTS.CSS.STYLE_ID);
      if (!style) {
        // 如果不存在，创建一个新的样式表
        style = document.createElement('style');
        style.id = CONSTANTS.CSS.STYLE_ID;
        document.head.appendChild(style);
      }

      // 将颜色值转换为rgba格式
      const r = parseInt(config.boxColor.slice(1, 3), 16);
      const g = parseInt(config.boxColor.slice(3, 5), 16);
      const b = parseInt(config.boxColor.slice(5, 7), 16);
      const rgbaColor = `${r}, ${g}, ${b}, `;
      // 计算更深的颜色（用于四边高亮）
      const darkR = Math.round(r * 0.6);
      const darkG = Math.round(g * 0.6);
      const darkB = Math.round(b * 0.6);
      const darkRgbaColor = `${darkR}, ${darkG}, ${darkB}, `;

      style.textContent = `
        :root {
          --hitable-theme-rgb: ${r}, ${g}, ${b};
        }
        .${CONSTANTS.CSS.OVERLAY_TOP}, .${CONSTANTS.CSS.OVERLAY_RIGHT}, .${CONSTANTS.CSS.OVERLAY_BOTTOM}, .${CONSTANTS.CSS.OVERLAY_LEFT} { background: rgba(${rgbaColor} 0.85) !important; }
        td[${CONSTANTS.ATTRS.CELL_SELECTED}="true"], th[${CONSTANTS.ATTRS.CELL_SELECTED}="true"] { background: rgba(${rgbaColor} 1) !important; }
        .HiTableOverlay td[${CONSTANTS.ATTRS.CELL_HIGHLIGHTED}="true"], .HiTableOverlay th[${CONSTANTS.ATTRS.CELL_HIGHLIGHTED}="true"] { background: rgba(${rgbaColor} 0.5) !important; }
        .HiTableOverlay td[${CONSTANTS.ATTRS.EDGE_HIGHLIGHTED}="true"], .HiTableOverlay th[${CONSTANTS.ATTRS.EDGE_HIGHLIGHTED}="true"] { background: rgba(${darkRgbaColor} 1) !important; }
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
      const selected = originalTable.querySelectorAll(CONSTANTS.SELECTORS.SELECTED_CELLS +
        ',[cell-anomaly],[cell-integrity-dup],[cell-integrity-round],[cell-integrity-digit]');
      selected.forEach(cell => {
        cell.removeAttribute(CONSTANTS.ATTRS.CELL_SELECTED);
        cell.removeAttribute(CONSTANTS.ATTRS.CELL_ISNAN);
        cell.removeAttribute('cell-anomaly');
        cell.removeAttribute('cell-integrity-dup');
        cell.removeAttribute('cell-integrity-round');
        cell.removeAttribute('cell-integrity-digit');
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

    // 同时收集原始文本和解析后的数值
    const rawData = [];
    selectedCellsData = Array.from({ length: bottom - top + 1 }, (_, r) => {
      rawData[r] = [];
      return Array.from({ length: right - left + 1 }, (_, c) => {
        let logicCell = logicTable.cell(top + r, left + c);
        if (!logicCell) return NaN;
        let cell = logicTable.actualCell(logicCell);
        if (!cell) return NaN;
        let rawText = cell.innerText.trim();
        rawData[r][c] = rawText;
        let value = parseNumber(rawText);
        if (isNaN(value)) {
          cell.setAttribute(CONSTANTS.ATTRS.CELL_ISNAN, 'true');
        }
        // 高亮单元格
        cell.setAttribute(CONSTANTS.ATTRS.CELL_SELECTED, 'true');
        return value;
      });
    });

    // 检测列和行的通用格式（货币前缀 + 数量级后缀）
    selectedCellsData._columnFormats = detectColumnFormats(rawData);
    selectedCellsData._rowFormats = detectRowFormats(rawData);

    // 条件格式化
    if (config.conditionalFormatting?.enabled !== false) {
      applyConditionalFormatting(top, left, bottom, right);
    }
  }

  /**
   * 对选中区域应用条件格式化
   * 三级：above-avg（饱满色）、below-avg（淡化色）、anomaly（脉冲闪烁）
   * 异常值定义：偏离均值超过 2 倍标准差
   * 颜色全部从主题色派生（通过 CSS 变量 --hitable-theme-rgb）
   */
  function applyConditionalFormatting(top, left, bottom, right) {
    const allValues = [];
    const cellEntries = [];

    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        const logicCell = logicTable.cell(r, c);
        if (!logicCell) continue;
        const value = parseNumber(logicCell.cell.innerText);
        if (!isNaN(value) && isFinite(value)) {
          allValues.push(value);
          cellEntries.push({ r, c, logicCell, value });
        }
      }
    }

    if (allValues.length < 3) return;

    // 全局统计
    const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const variance = allValues.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / allValues.length;
    const std = Math.sqrt(variance);
    const anomalyThreshold = 2 * std;

    // 逐列统计
    const colStats = {};
    for (let c = left; c <= right; c++) {
      const colVals = cellEntries.filter(e => e.c === c).map(e => e.value);
      if (colVals.length < 3) continue;
      const cAvg = colVals.reduce((a, b) => a + b, 0) / colVals.length;
      const cVar = colVals.reduce((s, v) => s + Math.pow(v - cAvg, 2), 0) / colVals.length;
      const cStd = Math.sqrt(cVar);
      colStats[c] = { avg: cAvg, std: cStd, threshold: 2 * cStd };
    }

    // 逐行统计
    const rowStats = {};
    for (let r = top; r <= bottom; r++) {
      const rowVals = cellEntries.filter(e => e.r === r).map(e => e.value);
      if (rowVals.length < 3) continue;
      const rAvg = rowVals.reduce((a, b) => a + b, 0) / rowVals.length;
      const rVar = rowVals.reduce((s, v) => s + Math.pow(v - rAvg, 2), 0) / rowVals.length;
      const rStd = Math.sqrt(rVar);
      rowStats[r] = { avg: rAvg, std: rStd, threshold: 2 * rStd };
    }

    cellEntries.forEach(({ r, c, logicCell, value }) => {
      const actualCell = logicTable.actualCell(logicCell);

      actualCell.removeAttribute('cell-anomaly');

      // 异常检测：全局、逐列、逐行 —— 任一范围异常即标记
      let isAnomaly = false;
      if (std > 0 && Math.abs(value - avg) > anomalyThreshold) isAnomaly = true;
      if (!isAnomaly && colStats[c] && colStats[c].std > 0 && Math.abs(value - colStats[c].avg) > colStats[c].threshold) isAnomaly = true;
      if (!isAnomaly && rowStats[r] && rowStats[r].std > 0 && Math.abs(value - rowStats[r].avg) > rowStats[r].threshold) isAnomaly = true;

      if (isAnomaly) {
        actualCell.setAttribute('cell-anomaly', 'true');
        // 记录异常原因
        const reasons = [];
        if (std > 0 && Math.abs(value - avg) > anomalyThreshold) {
          reasons.push(chrome.i18n.getMessage('anomalyReasonGlobal', [
            Number(value).toFixed(2), Number(avg).toFixed(2), Number(anomalyThreshold).toFixed(2)
          ]));
        }
        if (colStats[c] && colStats[c].std > 0 && Math.abs(value - colStats[c].avg) > colStats[c].threshold) {
          reasons.push(chrome.i18n.getMessage('anomalyReasonColumn', [Number(colStats[c].avg).toFixed(2)]));
        }
        if (rowStats[r] && rowStats[r].std > 0 && Math.abs(value - rowStats[r].avg) > rowStats[r].threshold) {
          reasons.push(chrome.i18n.getMessage('anomalyReasonRow', [Number(rowStats[r].avg).toFixed(2)]));
        }
        actualCell.setAttribute('data-anomaly-reason', reasons.join('\n'));
        actualCell.title = chrome.i18n.getMessage('anomalyTitle') + '\n' + reasons.join('\n');
      }
    });

    selectedCellsData._stats = { avg, std, anomalyThreshold, count: allValues.length };
  }
  // 解析数字
  function parseNumber(text) {
    // 全角数字归一化：１２３ → 123，全角逗号、小数点
    text = text.replace(/[０-９]/g, function(ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
    text = text.replace(/，/g, ',');
    text = text.replace(/．/g, '.');

    // 移除货币符号：美元、欧元、英镑、人民币/日元、俄罗斯卢布、印度卢比、港币、新台币
    text = text.replace(/[\$€£¥₽₹]|HK\$|NT\$/g, '');

    // 处理百分比
    let isPercentage = false;
    if (text.endsWith('%')) {
      text = text.slice(0, -1);
      isPercentage = true;
    }

    // 处理数量级后缀：K=千, M=百万, B=十亿
    let magnitude = 1;
    const lastChar = text[text.length - 1];
    if (lastChar === 'K' || lastChar === 'k') {
      magnitude = 1000;
      text = text.slice(0, -1);
    } else if (lastChar === 'M' || lastChar === 'm') {
      magnitude = 1000000;
      text = text.slice(0, -1);
    } else if (lastChar === 'B' || lastChar === 'b') {
      magnitude = 1000000000;
      text = text.slice(0, -1);
    }
    // 处理中文数量级：万亿/亿/万/w = 10,000 / 100,000,000 / 10¹²
    if (text.endsWith('万亿')) {
      magnitude = 1000000000000;
      text = text.slice(0, -2);
    } else if (text.endsWith('亿')) {
      magnitude = 100000000;
      text = text.slice(0, -1);
    } else if (text.endsWith('万')) {
      magnitude = 10000;
      text = text.slice(0, -1);
    } else if (lastChar === 'W' || lastChar === 'w') {
      magnitude = 10000;
      text = text.slice(0, -1);
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

    // 应用数量级后缀
    value *= magnitude;

    // 如果是百分比，将值除以100
    if (isPercentage) {
      value /= 100;
    }

    return value;
  }
  
  /**
   * 检测选中列的数值子类型
   * @param {LogicTable} logicTable
   * @param {number} startCol
   * @param {number} endCol
   * @param {number} startRow
   * @param {number} endRow
   * @returns {Array<{col: number, type: string, currencySymbol?: string, avgPrecision?: number}>}
   */
  function detectColumnTypes(logicTable, startCol, endCol, startRow, endRow) {
    const types = [];
    for (let col = startCol; col <= endCol; col++) {
      let integerCount = 0;
      let decimalCount = 0;
      let currencyCount = 0;
      let percentCount = 0;
      let numericCount = 0;
      let currencySymbols = {};
      let totalPrecision = 0;

      for (let row = startRow; row <= endRow; row++) {
        const cell = logicTable.cell(row, col);
        if (!cell) continue;
        const rawText = cell.cell.innerText.trim();

        const currencyMatch = rawText.match(/^[\$€£¥₹]|HK\$|NT\$/);
        if (currencyMatch) {
          currencyCount++;
          const symbol = currencyMatch[0];
          currencySymbols[symbol] = (currencySymbols[symbol] || 0) + 1;
        }

        if (rawText.endsWith('%')) {
          percentCount++;
        }

        const numValue = parseNumber(rawText);
        if (!isNaN(numValue)) {
          numericCount++;
          const cleaned = rawText.replace(/[\$€£¥₹%]|HK\$|NT\$/g, '').trim();
          const dotIdx = cleaned.lastIndexOf('.');
          if (dotIdx >= 0 && dotIdx > cleaned.length - 4) {
            decimalCount++;
            totalPrecision += cleaned.length - dotIdx - 1;
          } else {
            integerCount++;
          }
        }
      }

      if (numericCount === 0) continue;

      let type = 'decimal';
      let currencySymbol = null;
      let avgPrecision = decimalCount > 0 ? Math.round(totalPrecision / decimalCount) : 0;

      if (integerCount > decimalCount * 2) {
        type = 'integer';
      }

      if (currencyCount > numericCount * 0.5) {
        type = 'currency';
        let maxCount = 0;
        for (const [sym, count] of Object.entries(currencySymbols)) {
          if (count > maxCount) {
            maxCount = count;
            currencySymbol = sym;
          }
        }
      }

      if (percentCount > numericCount * 0.5) {
        type = 'percentage';
      }

      types.push({
        col,
        type,
        currencySymbol,
        avgPrecision,
        numericCount,
        totalCount: endRow - startRow + 1
      });
    }
    return types;
  }

  /**
   * 检测每列的通用格式（货币前缀 + 数量级后缀）
   * @returns {Object} { colIndex: { prefix, suffix, divisor } }
   */
  function detectColumnFormats(rawData) {
    const formats = {};
    const colCount = rawData[0]?.length || 0;
    for (let c = 0; c < colCount; c++) {
      const texts = rawData.map(row => row[c]).filter(t => t && t.trim());
      if (texts.length < 2) continue;
      const fmt = detectFormat(texts);
      if (fmt.prefix || fmt.suffix) {
        formats[c] = fmt;
      }
    }
    return formats;
  }

  /**
   * 检测每行的通用格式
   */
  function detectRowFormats(rawData) {
    const formats = {};
    for (let r = 0; r < rawData.length; r++) {
      const texts = rawData[r].filter(t => t && t.trim());
      if (texts.length < 2) continue;
      const fmt = detectFormat(texts);
      if (fmt.prefix || fmt.suffix) {
        formats[r] = fmt;
      }
    }
    return formats;
  }

  /**
   * 从一组文本中检测通用前缀/后缀
   * @returns {{ prefix: string, suffix: string, divisor: number }}
   */
  function detectFormat(texts) {
    // 提取前缀（货币符号）
    const prefixes = {};
    const suffixes = {};
    texts.forEach(t => {
      const m = t.match(/^([\$€£¥₹]|HK\$|NT\$)/);
      if (m) prefixes[m[0]] = (prefixes[m[0]] || 0) + 1;
      const last = t[t.length - 1];
      if (last === 'K' || last === 'k') suffixes['K'] = (suffixes['K'] || 0) + 1;
      else if (last === 'M' || last === 'm') suffixes['M'] = (suffixes['M'] || 0) + 1;
      else if (last === 'B' || last === 'b') suffixes['B'] = (suffixes['B'] || 0) + 1;
      else if (last === 'W' || last === 'w') suffixes['W'] = (suffixes['W'] || 0) + 1;
      else if (t.endsWith('万亿')) suffixes['万亿'] = (suffixes['万亿'] || 0) + 1;
      else if (t.endsWith('亿')) suffixes['亿'] = (suffixes['亿'] || 0) + 1;
      else if (t.endsWith('万')) suffixes['万'] = (suffixes['万'] || 0) + 1;
    });

    let prefix = '';
    let maxP = 0;
    for (const [p, c] of Object.entries(prefixes)) {
      if (c > maxP && c > texts.length * 0.5) { maxP = c; prefix = p; }
    }

    let suffix = '';
    let maxS = 0;
    const suffixMap = { 'K': 1000, 'W': 10000, '万': 10000, 'M': 1000000, '亿': 100000000, '万亿': 1000000000000, 'B': 1000000000 };
    for (const [s, c] of Object.entries(suffixes)) {
      if (c > maxS && c > texts.length * 0.5) { maxS = c; suffix = s; }
    }

    return { prefix, suffix, divisor: suffixMap[suffix] || 1 };
  }

  /**
   * 用检测到的格式格式化数值
   */
  function formatValue(value, fmt) {
    if (!fmt) return value;
    let v = value;
    let formatted = '';
    if (fmt.prefix) formatted += fmt.prefix;
    if (fmt.divisor > 1) v = v / fmt.divisor;
    formatted += Number(v).toFixed(2).replace(/\.?0+$/, '');
    if (fmt.suffix && fmt.suffix !== '万') formatted += fmt.suffix;
    if (fmt.suffix === '万') formatted += '万';
    return formatted;
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

    // 扩展覆盖表格（添加四边）
    extendOverlayTable(overlayTable);
    
    // 为每个单元格添加鼠标悬停事件（必须在扩展后，才能缓存所有单元格包括四边）
    addCrossHighlighted(overlayTable);
    
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
    // 缓存表格内所有单元格，避免重复查询 DOM
    const cachedCells = table.querySelectorAll('td');
    
    // 清除所有高亮的函数
    const clearAllHighlights = () => {
      cachedCells.forEach(cell => {
        cell.removeAttribute(CONSTANTS.ATTRS.CELL_HIGHLIGHTED);
        cell.removeAttribute(CONSTANTS.ATTRS.EDGE_HIGHLIGHTED);
      });
    };
    
    // 使用节流优化 mouseover 事件处理
    const handleMouseOver = throttle(function(event) {
      if (event.target.tagName.toLowerCase() === 'td') {
        // 清除所有单元格的状态（使用缓存）
        clearAllHighlights();

        const cell = event.target;
        // 获取十字单元格
        const crossCells = getCrossCells(cell);
        // 高亮十字单元格
        crossCells.forEach(crossCell => {
          // 四边单元格使用 edge-highlighted，普通单元格使用 cell-highlighted
          const isEdge = crossCell.classList.contains(CONSTANTS.CSS.OVERLAY_TOP) ||
                         crossCell.classList.contains(CONSTANTS.CSS.OVERLAY_RIGHT) ||
                         crossCell.classList.contains(CONSTANTS.CSS.OVERLAY_BOTTOM) ||
                         crossCell.classList.contains(CONSTANTS.CSS.OVERLAY_LEFT);
          if (isEdge) {
            crossCell.setAttribute(CONSTANTS.ATTRS.EDGE_HIGHLIGHTED, 'true');
          } else {
            crossCell.setAttribute(CONSTANTS.ATTRS.CELL_HIGHLIGHTED, 'true');
          }
        });
      }
    }, CONSTANTS.PERF.THROTTLE_MS);

    table.addEventListener('mouseover', handleMouseOver);
    
    // 鼠标离开表格时清除所有高亮
    table.addEventListener('mouseleave', clearAllHighlights);
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
    const colCells = Array.from(table.rows).map(row => row.cells[col] || null);
  
    // 检查是否是四边单元格
    const isTop = cell.classList.contains(CONSTANTS.CSS.OVERLAY_TOP);
    const isBottom = cell.classList.contains(CONSTANTS.CSS.OVERLAY_BOTTOM);
    const isLeft = cell.classList.contains(CONSTANTS.CSS.OVERLAY_LEFT);
    const isRight = cell.classList.contains(CONSTANTS.CSS.OVERLAY_RIGHT);
  
    // 检查是否是四个角单元格
    const isCorner = (isTop && isLeft) || (isTop && isRight) || (isBottom && isLeft) || (isBottom && isRight);
    if (isCorner) {
      // 如果是四个角单元格，不高亮其相关的两个边
      return [];
    }

    if (isTop || isBottom || isLeft || isRight) {
      // 如果是四边单元格，只高亮对应的行或列，并且不高亮其对面的边的对应格子
      if (isTop) {
        crossCells.push(...colCells.filter(crossCell => !crossCell.classList.contains(CONSTANTS.CSS.OVERLAY_BOTTOM)));
      } else if (isBottom) {
        crossCells.push(...colCells.filter(crossCell => !crossCell.classList.contains(CONSTANTS.CSS.OVERLAY_TOP)));
      } else if (isLeft) {
        crossCells.push(...rowCells.filter(crossCell => !crossCell.classList.contains(CONSTANTS.CSS.OVERLAY_RIGHT)));
      } else if (isRight) {
        crossCells.push(...rowCells.filter(crossCell => !crossCell.classList.contains(CONSTANTS.CSS.OVERLAY_LEFT)));
      }
    } else {
      // 如果是普通单元格，高亮对应的行和列
      crossCells.push(...rowCells);
      crossCells.push(...colCells);
    }
  
    return crossCells;
  }

  // 创建覆盖表格并添加单元格
  function createOverlayTable(left, top, cells = [], withContent = false) {
    if (overlayTable && document.body.contains(overlayTable)) {
      document.body.removeChild(overlayTable);
    }
    // 创建一个新的表格
    overlayTable = document.createElement('table');

    // 添加必要的类
    overlayTable.classList.add(CONSTANTS.CSS.OVERLAY);

    // 设置表格样式 - 使用 collapse 并移除表格自身的边框和间距
    overlayTable.style.borderCollapse = 'collapse';
    overlayTable.style.borderSpacing = '0';
    overlayTable.style.padding = '0';
    overlayTable.style.border = 'none';

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
        prevCell = clone;
      } else if (prevCell !== null) {
        // 如果当前单元格为空，那么将前一个 DOM 单元格的 colSpan 加 1
        prevCell.colSpan = (prevCell.colSpan || 1) + 1;
      }
    });

    return copiedCells;
  }

  // 复制单元格 - 精确复制原单元格的显示尺寸
  function copyCell(cell, withContent = false) {
    if (cell === null) {
      return null;
    }
    const actualCell = logicTable.actualCell(cell);

    // 用 getBoundingClientRect 获取精确显示尺寸（TD 和 DIV 均适用）
    const rect = actualCell.getBoundingClientRect();
    const cellWidth = rect.width;
    const cellHeight = rect.height;

    // 获取原单元格的样式
    const style = window.getComputedStyle(actualCell);
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const paddingLeft = parseFloat(style.paddingLeft) || 0;

    // 创建新单元格
    const newCell = document.createElement('td');

    // 使用 box-sizing: border-box 确保设置的宽高就是最终显示尺寸
    newCell.style.boxSizing = 'border-box';
    newCell.style.width = `${cellWidth}px`;
    newCell.style.height = `${cellHeight}px`;
    newCell.style.padding = `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`;
    newCell.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    newCell.style.textAlign = 'right'; // 文字右对齐
    
    newCell.setAttribute('cell-selected', true);
    if (withContent && actualCell.getAttribute('cell-isNaN')) {
      newCell.setAttribute('cell-isNaN', actualCell.getAttribute('cell-isNaN'));
    }
    // 异常值在浮层中也显示脉冲闪烁和原因
    if (withContent && actualCell.hasAttribute('cell-anomaly')) {
      newCell.setAttribute('cell-anomaly', 'true');
      const reason = actualCell.getAttribute('data-anomaly-reason');
      if (reason) {
        newCell.setAttribute('data-anomaly-reason', reason);
        newCell.title = chrome.i18n.getMessage('anomalyTitle') + '\n' + reason;
      }
    }

    // 创建内容 div（去除交互元素）
    const div = document.createElement('div');
    if (withContent) {
      // 克隆内容但移除可交互元素
      const clone = actualCell.cloneNode(true);
      clone.querySelectorAll('a, button, input, select, textarea, [onclick], [role="button"]').forEach(el => {
        el.replaceWith(el.textContent);
      });
      div.innerText = clone.innerText;
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
    Array.from(newRow.cells).forEach(cell => cell.classList.add(CONSTANTS.CSS.OVERLAY_TOP));
    overlayTable.insertBefore(newRow, firstRow);

    // 复制表格最后一行，并插入到表格最后一行后
    const lastRow = overlayTable.rows[overlayTable.rows.length - 1];
    const newLastRow = lastRow.cloneNode(true);
    Array.from(newLastRow.cells).forEach(cell => cell.classList.add(CONSTANTS.CSS.OVERLAY_BOTTOM));
    overlayTable.appendChild(newLastRow);

    // 复制表格第一列，并插入到表格第一列前
    const newFirstCol = Array.from(overlayTable.rows, row => row.cells[0].cloneNode(true));

    newFirstCol.forEach((cell, index) => {
      cell.classList.add(CONSTANTS.CSS.OVERLAY_LEFT);
      overlayTable.rows[index].insertBefore(cell, overlayTable.rows[index].cells[0]);
    });

    // 复制表格最后一列，并插入到表格最后一列后
    const newLastCol = Array.from(overlayTable.rows, row => row.cells[row.cells.length - 1].cloneNode(true));

    newLastCol.forEach((cell, index) => {
      cell.classList.add(CONSTANTS.CSS.OVERLAY_RIGHT);
      overlayTable.rows[index].appendChild(cell);
    });

    // 移除属性
    const overlayCells = overlayTable.querySelectorAll(CONSTANTS.SELECTORS.OVERLAY_EDGES);
    overlayCells.forEach(cell => {
      cell.removeAttribute(CONSTANTS.ATTRS.CELL_SELECTED);
      cell.removeAttribute(CONSTANTS.ATTRS.CELL_ISNAN);
      cell.removeAttribute('cell-anomaly');
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
    const index = directions.indexOf(direction);
    // 获取相邻的两个方向（角是两个边的交点）
    const prevDirection = directions[(index + 3) % 4];
    const nextDirection = directions[(index + 1) % 4];

    // 尝试两种 CSS 类名顺序
    let corner = overlayTable.querySelector(`.HiTableOverlay-${direction}.HiTableOverlay-${prevDirection}`);
    if (!corner) {
      corner = overlayTable.querySelector(`.HiTableOverlay-${prevDirection}.HiTableOverlay-${direction}`);
    }
    if (!corner) {
      corner = overlayTable.querySelector(`.HiTableOverlay-${direction}.HiTableOverlay-${nextDirection}`);
    }
    if (!corner) {
      corner = overlayTable.querySelector(`.HiTableOverlay-${nextDirection}.HiTableOverlay-${direction}`);
    }

    return corner;
  }

  // 外围角点击处理程序
  function cornerClick(direction) {
    return (event) => {
      // 使用配置中启用的算法列表，如果没有则使用默认列表
      const algorithms = config.enabledAlgorithms || DEFAULT_ENABLED_ALGORITHMS;
      const algorithm = config.algorithm[direction.toLowerCase()];
      const index = algorithms.indexOf(algorithm);
      // 切换到下一个算法，如果已经是最后一个算法，那么切换到第一个算法
      // 如果当前算法不在启用列表中，从第一个开始
      const nextIndex = index === -1 ? 0 : (index + 1) % algorithms.length;
      const nextAlgorithm = algorithms[nextIndex];
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
            td.setAttribute(CONSTANTS.ATTRS.EDGE_HIGHLIGHTED, 'true');
          } else {
            td.removeAttribute(CONSTANTS.ATTRS.EDGE_HIGHLIGHTED);
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
    // 众数 - 出现次数最多的值
    MOD: (data) => {
      const frequency = {};
      let maxFreq = 0;
      let mode = data[0];
      data.forEach(value => {
        frequency[value] = (frequency[value] || 0) + 1;
        if (frequency[value] > maxFreq) {
          maxFreq = frequency[value];
          mode = value;
        }
      });
      return mode;
    },
    // 下四分位数 (25%)
    Q1: (data) => {
      const sorted = data.slice().sort((a, b) => a - b);
      const pos = (sorted.length - 1) * 0.25;
      const lower = Math.floor(pos);
      const upper = Math.ceil(pos);
      if (lower === upper) {
        return sorted[lower];
      }
      return sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
    },
    // 上四分位数 (75%)
    Q3: (data) => {
      const sorted = data.slice().sort((a, b) => a - b);
      const pos = (sorted.length - 1) * 0.75;
      const lower = Math.floor(pos);
      const upper = Math.ceil(pos);
      if (lower === upper) {
        return sorted[lower];
      }
      return sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
    },
    // 四分位距
    IQR: (data) => statistics['Q3'](data) - statistics['Q1'](data),
    // 偏度 - 衡量分布对称性
    SKW: (data) => {
      const n = data.length;
      if (n < 3) return 0;
      const avg = statistics['AVG'](data);
      const std = statistics['STD'](data);
      if (std === 0) return 0;
      const sum = data.reduce((acc, val) => acc + Math.pow((val - avg) / std, 3), 0);
      return (n / ((n - 1) * (n - 2))) * sum;
    },
    // 峰度 - 衡量分布尖峭程度
    KUR: (data) => {
      const n = data.length;
      if (n < 4) return 0;
      const avg = statistics['AVG'](data);
      const std = statistics['STD'](data);
      if (std === 0) return 0;
      const sum = data.reduce((acc, val) => acc + Math.pow((val - avg) / std, 4), 0);
      const kurtosis = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum;
      const adjustment = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
      return kurtosis - adjustment; // 超额峰度（正态分布为0）
    },
  };

  // 计算
  function calculation(targetDirection, targetAlgorithm) {
    // 检测列类型（供 tooltip 使用）
    const [top, left, bottom, right] = getSelectedRect();
    const columnTypes = detectColumnTypes(logicTable, left, right, top, bottom);

    for (let i = 0; i < directions.length; i++) {
      const direction = directions[i];
      const corner = getCorner(overlayTable, direction);
      let algorithm = config.algorithm[direction];
      if (corner) {
        const div = corner.querySelector('div');
        if (div) {
          div.textContent = algorithm;
          div.title = chrome.i18n.getMessage('algorithmTitle', [chrome.i18n.getMessage('direction_' + direction), algorithmNames[algorithm]]);
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
            var isColumn = direction === 'top' || direction === 'bottom';

            if (algorithm) {
              const data = isColumn ? selectedCellsData.map(row => row[index - 1]) : selectedCellsData[index - 1];
              if (statistics[algorithm]) {
                // 过滤掉非数字的值
                value = data.filter(value => !isNaN(value));
                value = statistics[algorithm](value);
                // 结果精度不超过原数据最小精度
                if (isColumn) {
                  const colType = columnTypes.find(ct => ct.col === (left + index - 1));
                  if (colType && colType.type !== 'percentage') {
                    const precision = colType.type === 'integer' ? 0 : (colType.avgPrecision || 0);
                    value = parseFloat(Number(value).toFixed(precision));
                  }
                } else {
                  // 行方向：以选中数据中该行的最小精度为准
                  const rowData = selectedCellsData[index - 1].filter(v => !isNaN(v) && isFinite(v));
                  if (rowData.length > 0) {
                    const maxPrecision = Math.max(...rowData.map(v => {
                      const s = String(v);
                      const dot = s.indexOf('.');
                      return dot >= 0 ? s.length - dot - 1 : 0;
                    }));
                    value = parseFloat(Number(value).toFixed(maxPrecision));
                  }
                }

                title = chrome.i18n.getMessage('statisticsTitle', [isColumn ? chrome.i18n.getMessage('Column') : chrome.i18n.getMessage('Row'), index, algorithmNames[algorithm], value]);
                // 附加列类型标注
                if (isColumn) {
                  const colType = columnTypes.find(ct => ct.col === (left + index - 1));
                  if (colType) {
                    let typeHint = '';
                    switch (colType.type) {
                      case 'integer': typeHint = ' [' + chrome.i18n.getMessage('colTypeInteger') + ']'; break;
                      case 'currency': typeHint = ' [' + chrome.i18n.getMessage('colTypeCurrency') + (colType.currencySymbol ? ': ' + colType.currencySymbol : '') + ']'; break;
                      case 'percentage': typeHint = ' [' + chrome.i18n.getMessage('colTypePercentage') + ']'; break;
                      case 'decimal': typeHint = ' [' + chrome.i18n.getMessage('colTypeDecimal') + (colType.avgPrecision ? ' (' + colType.avgPrecision + ' ' + chrome.i18n.getMessage('colTypeDp') + ')' : '') + ']'; break;
                    }
                    title += typeHint;
                  }
                }
              } else {
                handleError('calculation', new Error(`Unknown algorithm: ${algorithm}`));
                value = 'N/A';
                title = chrome.i18n.getMessage('unknownAlgorithm') + algorithm;
              }
            }

            // 格式化显示值（保留货币前缀/数量级后缀）
            let displayValue = value;
            try {
              if (typeof value === 'number' && isFinite(value) && typeof isColumn !== 'undefined') {
                if (isColumn && selectedCellsData._columnFormats) {
                  const colFmt = selectedCellsData._columnFormats[left + index - 1];
                  if (colFmt) displayValue = formatValue(value, colFmt);
                } else if (!isColumn && selectedCellsData._rowFormats) {
                  const rowFmt = selectedCellsData._rowFormats[index - 1];
                  if (rowFmt) displayValue = formatValue(value, rowFmt);
                }
              }
            } catch (e) {
              // 格式转换失败时保持原值
            }

            div.textContent = displayValue;
            div.title = title;
          }
        });
      }

    }

    // 数据完整性检测
    if (window.HiTableDataIntegrity && selectedCellsData.length >= 3) {
      try {
        const columnLabels = [];
        const rawData2D = [];
        for (let c = left; c <= right; c++) {
          const headerCell = logicTable.cell(top, c);
          columnLabels.push(headerCell ? headerCell.cell.innerText.trim() : '');
        }

        // 收集原始文本数据（用于文本方式的末位数字检测）
        for (let r = top; r <= bottom; r++) {
          const rawRow = [];
          for (let c = left; c <= right; c++) {
            const cell = logicTable.cell(r, c);
            rawRow.push(cell ? cell.cell.innerText.trim() : '');
          }
          rawData2D.push(rawRow);
        }

        const integrityResults = window.HiTableDataIntegrity.analyze(selectedCellsData, columnLabels, rawData2D);
        if (integrityResults && integrityResults.flagCount > 0) {
          const summaryItems = window.HiTableDataIntegrity.generateSummary(integrityResults, chrome.i18n.getMessage.bind(chrome.i18n));
          showIntegrityIndicator(integrityResults, summaryItems);
        }
      } catch (e) {
        handleError('dataIntegrity', e);
      }
    }
  }

  /**
   * 在 overlay 上显示数据完整性检测指示器，并在原表格上标记问题单元格
   */
  function showIntegrityIndicator(results, summaryItems) {
    if (!overlayTable || summaryItems.length === 0) return;

    // 在原表格上标记问题单元格
    markIntegrityCells(results);

    const existing = overlayTable.querySelector('.HiTableIntegrityIndicator');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.className = 'HiTableIntegrityIndicator';
    indicator.style.cssText = 'position:absolute;bottom:-38px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:5px 14px;font-size:12px;color:#e67e22;cursor:help;white-space:nowrap;background:rgba(0,0,0,0.85);border:1px solid rgba(230,126,34,0.3);border-radius:16px;max-width:90%;overflow:hidden;text-overflow:ellipsis;';

    const icon = document.createElement('span');
    icon.textContent = '⚠️';
    indicator.appendChild(icon);

    const text = document.createElement('span');
    text.textContent = summaryItems.length + ' ' + chrome.i18n.getMessage('integrityIssuesFound');
    indicator.appendChild(text);

    indicator.title = summaryItems.map(s => '• ' + s).join('\n');

    const overlayStyle = window.getComputedStyle(overlayTable);
    if (overlayStyle.position === 'static') {
      overlayTable.style.position = 'relative';
    }
    overlayTable.appendChild(indicator);

    overlayTable._integrityResults = results;
  }

  /**
   * 在原表格的选中区域标记数据完整性问题的具体单元格
   */
  function markIntegrityCells(results) {
    if (!results || !originalTable) return;

    const [top, left, bottom, right] = getSelectedRect();

    // 收集整体问题值
    const duplicateValue = results.overall.duplicate?.flagged ? results.overall.duplicate.mostFrequentValue : null;
    const roundingFlagged = results.overall.rounding?.flagged;
    const dominantLastDigit = results.overall.lastDigit?.flagged ? results.overall.lastDigit.dominantDigit : null;

    // 收集逐行问题（rowIndex → {dupVal, rounding}）
    const rowIssues = new Map();
    if (results.rows) {
      results.rows.forEach(rowResult => {
        const issues = {};
        if (rowResult.duplicate?.flagged && rowResult.duplicate.mostFrequentCount >= 2) {
          issues.dupVal = rowResult.duplicate.mostFrequentValue;
        }
        if (rowResult.rounding?.flagged) {
          issues.rounding = true;
        }
        if (Object.keys(issues).length > 0) {
          rowIssues.set(rowResult.rowIndex, issues);
        }
      });
    }

    // 收集逐列问题
    const colIssues = new Map();
    if (results.columns) {
      results.columns.forEach(colResult => {
        const issues = {};
        if (colResult.duplicate?.flagged && colResult.duplicate.mostFrequentCount >= 2) {
          issues.dupVal = colResult.duplicate.mostFrequentValue;
        }
        if (colResult.rounding?.flagged) {
          issues.rounding = true;
        }
        if (Object.keys(issues).length > 0) {
          colIssues.set(colResult.colIndex, issues);
        }
      });
    }

    for (let r = top; r <= bottom; r++) {
      const rowIdx = r - top;
      const rowIssue = rowIssues.get(rowIdx);

      for (let c = left; c <= right; c++) {
        const colIdx = c - left;
        const colIssue = colIssues.get(colIdx);

        const logicCell = logicTable.cell(r, c);
        if (!logicCell) continue;
        const actualCell = logicTable.actualCell(logicCell);
        const rawText = actualCell.innerText.trim();
        const value = parseNumber(rawText);

        if (isNaN(value)) continue;

        let marked = false;
        const rounded = Math.round(value * 10000) / 10000;

        // 整表重复值标记
        if (duplicateValue !== null && !marked) {
          const dupRounded = Math.round(duplicateValue * 10000) / 10000;
          if (rounded === dupRounded) {
            actualCell.setAttribute('cell-integrity-dup', 'true');
            marked = true;
          }
        }

        // 逐行/逐列重复值标记
        if (!marked) {
          const rowDupVal = rowIssue?.dupVal;
          const colDupVal = colIssue?.dupVal;
          if (rowDupVal !== undefined && Math.round(rowDupVal * 10000) / 10000 === rounded) {
            actualCell.setAttribute('cell-integrity-dup', 'true');
            marked = true;
          } else if (colDupVal !== undefined && Math.round(colDupVal * 10000) / 10000 === rounded) {
            actualCell.setAttribute('cell-integrity-dup', 'true');
            marked = true;
          }
        }

        // 取整偏好标记（整体、逐行、逐列）
        if (roundingFlagged && !marked) {
          const intPart = Math.floor(Math.abs(value));
          if (intPart > 0 && (intPart % 10 === 0 || intPart % 5 === 0)) {
            actualCell.setAttribute('cell-integrity-round', 'true');
            marked = true;
          }
        }
        if (!marked && (rowIssue?.rounding || colIssue?.rounding)) {
          const intPart = Math.floor(Math.abs(value));
          if (intPart > 0 && (intPart % 10 === 0 || intPart % 5 === 0)) {
            actualCell.setAttribute('cell-integrity-round', 'true');
            marked = true;
          }
        }

        // 末位数字异常标记
        if (dominantLastDigit !== null && !marked) {
          const cleaned = rawText.replace(/[\$€£¥₹%]|HK\$|NT\$/g, '').trim();
          const lastChar = cleaned[cleaned.length - 1];
          if (lastChar === String(dominantLastDigit)) {
            actualCell.setAttribute('cell-integrity-digit', 'true');
            marked = true;
          }
        }

        if (!marked) {
          actualCell.removeAttribute('cell-integrity-dup');
          actualCell.removeAttribute('cell-integrity-round');
          actualCell.removeAttribute('cell-integrity-digit');
        }
      }
    }
  }
})();