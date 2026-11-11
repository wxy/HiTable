(async function() {
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

  const getMessage = window.HiTablePageI18n
    ? await window.HiTablePageI18n
    : chrome.i18n.getMessage.bind(chrome.i18n);

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
      const span = this.cell.colSpan || 1;
      if (span === 1) {
        width = this.cell.getBoundingClientRect().width;
      } else {
        for (let row = 0; row < this.table.rows.length; row++) {
          let logicCell = this.table.rows[row][this.col];
          if (logicCell && logicCell.cell.colSpan === 1) {
            width = logicCell.cell.getBoundingClientRect().width;
            break;
          }
        }
        if (width === 0) {
          width = this.cell.getBoundingClientRect().width / span;
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
      const span = this.cell.rowSpan || 1;
      if (span === 1) {
        height = this.cell.getBoundingClientRect().height;
      } else {
        let rowCells = this.table.rows[this.row];
        if (rowCells) {
          for (let col = 0; col < rowCells.length; col++) {
            let logicCell = rowCells[col];
            if (logicCell && logicCell.cell.rowSpan === 1) {
              height = logicCell.cell.getBoundingClientRect().height;
              break;
            }
          }
        }
        if (height === 0) {
          height = this.cell.getBoundingClientRect().height / span;
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
  let tableSnapshot = null;
  let activePointerId = null;
  let dragOrigin = null;
  let dragStarted = false;
  let pendingClick = false;
  let pendingDoubleClick = false;
  let disposed = false;
  let selectionFrame = null;
  let resizeState = null;
  let algorithmMenu = null;
  let menuButton = null;
  let copyToast = null;
  let copyToastTimer;
  let clipboardRequest = 0;
  const selectionListeners = [];
  const systemColorScheme = matchMedia('(prefers-color-scheme: dark)');
  const backgroundObserver = new MutationObserver(scheduleThemeRefresh);
  let themeRefreshFrame;


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
    CNT: getMessage('algorithmNameCNT'),
    SUM: getMessage('algorithmNameSUM'),
    AVG: getMessage('algorithmNameAVG'),
    VAR: getMessage('algorithmNameVAR'),
    MIN: getMessage('algorithmNameMIN'),
    MAX: getMessage('algorithmNameMAX'),
    RNG: getMessage('algorithmNameRNG'),
    MED: getMessage('algorithmNameMED'),
    STD: getMessage('algorithmNameSTD'),
    MOD: getMessage('algorithmNameMOD'),
    Q1: getMessage('algorithmNameQ1'),
    Q3: getMessage('algorithmNameQ3'),
    IQR: getMessage('algorithmNameIQR'),
    SKW: getMessage('algorithmNameSKW'),
    KUR: getMessage('algorithmNameKUR'),
  };

  // 所有可用的算法列表
  const ALL_ALGORITHMS = ['CNT', 'SUM', 'AVG', 'MIN', 'MAX', 'MED', 'VAR', 'STD', 'RNG', 'MOD', 'Q1', 'Q3', 'IQR', 'SKW', 'KUR'];
  
  // 默认启用的算法（基础统计 + 高级统计）
  const DEFAULT_ENABLED_ALGORITHMS = ['CNT', 'SUM', 'AVG', 'MIN', 'MAX', 'RNG', 'MED', 'STD', 'VAR', 'MOD'];
  // ==========================================
  // 事件处理程序
  // ==========================================
  function stopSelectionEvent(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function selectableCell(target) {
    const cell = target instanceof Element
      ? target.closest('td, th, [data-hitable-cell]') : null;
    return isSelectableCell(cell) ? cell : null;
  }

  function captureTableSnapshot() {
    const cells = new Map();
    for (const row of logicTable.rows) {
      for (const cell of row) {
        if (!cell) continue;
        cell.width();
        cell.height();
        if (cells.has(cell.cell)) continue;
        const element = cell.cell;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        cells.set(element, {
          text: element.innerText.trim(),
          rect: { left: rect.left + scrollX, top: rect.top + scrollY,
            right: rect.right + scrollX, bottom: rect.bottom + scrollY,
            width: rect.width, height: rect.height },
          padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft],
          cell
        });
      }
    }
    tableSnapshot = { cells, geometry: [...cells.values()],
      language: originalTable.closest('[lang]')?.getAttribute('lang') };
    applySelectionTheme();
  }

  function cellText(cell) {
    return tableSnapshot.cells.get(cell).text;
  }

  function updatePointerSelection(event) {
    if (resizeState && !resizeState.moved) {
      if (Math.hypot(event.clientX - resizeState.pointerOrigin.x,
        event.clientY - resizeState.pointerOrigin.y) < 4) return;
      resizeState.moved = true;
    }
    if (!resizeState && !dragStarted) {
      if (Math.hypot(event.clientX - dragOrigin.x, event.clientY - dragOrigin.y) < 4) return;
      dragStarted = true;
      selectCellsAndFillArray();
    }
    const x = event.clientX + scrollX - (resizeState ? resizeState.grabOffset.x : 0);
    const y = event.clientY + scrollY - (resizeState ? resizeState.grabOffset.y : 0);
    const hit = (resizeState ? resizeState.geometry : tableSnapshot.geometry).find(({ rect }) =>
      x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom);
    if (!hit || hit.cell === currentCell) return;
    currentCell = hit.cell;
    if (resizeState) {
      endCell = currentCell;
      positionSelectionFrame(true);
      return;
    }
    if (event.shiftKey && startCell.col === 0 && currentCell.col === 0) {
      endCell = logicTable.rows[currentCell.row][logicTable.totalCols - 1];
    } else if (event.shiftKey && startCell.row === 0 && currentCell.row === 0) {
      endCell = logicTable.rows[logicTable.totalRows - 1][currentCell.col];
    } else {
      endCell = currentCell;
    }
    deselectAllCells();
    selectCellsAndFillArray();
  }

  function releasePointer() {
    const pointer = activePointerId;
    activePointerId = null;
    isMouseDown = false;
    if (pointer !== null && document.documentElement.hasPointerCapture(pointer)) {
      document.documentElement.releasePointerCapture(pointer);
    }
  }

  function clearSelection() {
    resizeState = null;
    dragOrigin = null;
    dragStarted = false;
    releasePointer();
    closeAlgorithmMenu();
    clipboardRequest++;
    clearTimeout(copyToastTimer);
    copyToast?.remove();
    copyToast = null;
    deselectAllCells();
    clearOverlayTable();
    tableSnapshot = null;
    selectedCellsData = [];
    startCell = endCell = currentCell = null;
    originalTable = logicTable = null;
    lastPressCtrlC = 0;
  }

  function boundsOf(rects) {
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (const rect of rects) {
      left = Math.min(left, rect.left);
      top = Math.min(top, rect.top);
      right = Math.max(right, rect.right);
      bottom = Math.max(bottom, rect.bottom);
    }
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  function overlayDataBounds() {
    return boundsOf([...overlayTable.querySelectorAll('.HiTableDataCell')]
      .map(cell => cell.getBoundingClientRect()));
  }

  function positionSelectionFrame(preview = false) {
    if (!overlayTable) return;
    if (!selectionFrame) {
      selectionFrame = document.createElement('div');
      selectionFrame.className = 'HiTableSelectionFrame';
      for (const corner of ['nw', 'ne', 'sw', 'se']) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'HiTableResizeHandle';
        button.dataset.corner = corner;
        button.title = getMessage('resize_' + corner);
        button.setAttribute('aria-label', button.title);
        selectionFrame.appendChild(button);
      }
      document.body.appendChild(selectionFrame);
    }
    const [top, left, bottom, right] = getSelectedRect();
    const rect = preview ? boundsOf(resizeState.geometry.filter(({cell}) =>
      cell.row >= top && cell.row <= bottom && cell.col >= left && cell.col <= right)
      .map(({rect}) => rect)) : overlayDataBounds();
    const x = preview ? 0 : scrollX;
    const y = preview ? 0 : scrollY;
    // Table grid strokes paint on rounded CSS-pixel edges. Anchor handles to
    // those stroke centres; the existing grid draws the resting boundary.
    const frameLeft = Math.round(rect.left + x) - 0.5;
    const frameTop = Math.round(rect.top + y) - 0.5;
    const frameRight = Math.round(rect.right + x) - 0.5;
    const frameBottom = Math.round(rect.bottom + y) - 0.5;
    Object.assign(selectionFrame.style, {
      left: `${frameLeft}px`, top: `${frameTop}px`,
      width: `${frameRight - frameLeft}px`, height: `${frameBottom - frameTop}px`
    });
    selectionFrame.classList.toggle('is-resizing', preview);
    selectionFrame.dataset.size = getMessage('selectionDimensions',
      [String(bottom - top + 1), String(right - left + 1)]);
  }

  function startResize(corner, pointerEvent) {
    closeAlgorithmMenu();
    clipboardRequest++;
    copyToast?.remove();
    const [top, left, bottom, right] = getSelectedRect();
    const visible = overlayDataBounds();
    const widths = [...LogicCell.colWidths], heights = [...LogicCell.rowHeights];
    // Use the displayed grid for both hit testing and the preview. Extend its
    // axes with cached sizes so expanding a selection still uses the snapshot.
    [...overlayTable.querySelector('colgroup').children].slice(1, -1).forEach((col, i) => {
      widths[left + i] = col.getBoundingClientRect().width;
    });
    [...overlayTable.rows].slice(1, -1).forEach((row, i) => {
      heights[top + i] = row.getBoundingClientRect().height;
    });
    const originX = visible.left + scrollX - widths.slice(0, left).reduce((sum, width) => sum + width, 0);
    let y = visible.top + scrollY - heights.slice(0, top).reduce((sum, height) => sum + height, 0);
    const geometry = [];
    for (let r = 0; r < logicTable.totalRows; r++) {
      let x = originX;
      for (let c = 0; c < logicTable.totalCols; c++) {
        const cell = logicTable.cell(r, c);
        if (cell) geometry.push({cell, rect: {left: x, top: y, right: x + widths[c], bottom: y + heights[r]}});
        x += widths[c];
      }
      y += heights[r];
    }
    resizeState = { start: startCell, end: endCell, geometry };
    const north = corner.includes('n'), west = corner.includes('w');
    startCell = { row: north ? bottom : top, col: west ? right : left };
    endCell = { row: north ? top : bottom, col: west ? left : right };
    currentCell = endCell;
    if (pointerEvent) {
      const handle = selectionFrame.querySelector(`[data-corner="${corner}"]`).getBoundingClientRect();
      resizeState.pointerOrigin = { x: pointerEvent.clientX, y: pointerEvent.clientY };
      resizeState.grabOffset = {
        x: pointerEvent.clientX - (handle.left + handle.width / 2),
        y: pointerEvent.clientY - (handle.top + handle.height / 2)
      };
      resizeState.moved = false;
      activePointerId = pointerEvent.pointerId;
      isMouseDown = true;
      pendingClick = true;
      document.documentElement.setPointerCapture(pointerEvent.pointerId);
    }
    positionSelectionFrame(true);
  }

  function finishResize(cancelled) {
    const previous = resizeState;
    releasePointer();
    resizeState = null;
    if (cancelled) {
      startCell = previous.start;
      endCell = previous.end;
      currentCell = endCell;
      positionSelectionFrame();
    } else {
      deselectAllCells();
      selectCellsAndFillArray();
      showOverlay();
      calculation();
    }
  }

  function closeAlgorithmMenu(restoreFocus = false) {
    algorithmMenu?.remove();
    algorithmMenu = null;
    if (menuButton) {
      menuButton.setAttribute('aria-expanded', 'false');
      if (restoreFocus) menuButton.focus();
    }
    menuButton = null;
  }

  function openAlgorithmMenu(direction, button, focusLast = false) {
    if (algorithmMenu && menuButton === button) { closeAlgorithmMenu(true); return; }
    closeAlgorithmMenu();
    menuButton = button;
    button.setAttribute('aria-expanded', 'true');
    algorithmMenu = document.createElement('div');
    algorithmMenu.className = 'HiTableMenu';
    algorithmMenu.setAttribute('role', 'menu');
    const title = document.createElement('div');
    title.className = 'HiTableMenuTitle';
    title.textContent = getMessage('menu_' + direction);
    algorithmMenu.setAttribute('aria-label', title.textContent);
    algorithmMenu.appendChild(title);
    for (const algorithm of config.enabledAlgorithms || DEFAULT_ENABLED_ALGORITHMS) {
      const item = document.createElement('button');
      item.type = 'button';
      item.tabIndex = -1;
      item.dataset.algorithm = algorithm;
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('aria-checked', String(config.algorithm[direction] === algorithm));
      const name = document.createElement('span');
      name.textContent = algorithmNames[algorithm];
      const code = document.createElement('small');
      code.textContent = algorithm;
      code.setAttribute('aria-hidden', 'true');
      item.append(name, code);
      item.addEventListener('click', event => {
        event.stopPropagation();
        config.algorithm[direction] = algorithm;
        closeAlgorithmMenu(true);
        calculation(direction, algorithm);
      });
      algorithmMenu.appendChild(item);
    }
    for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'keydown']) {
      algorithmMenu.addEventListener(type, event => event.stopPropagation());
    }
    document.body.appendChild(algorithmMenu);
    const anchor = button.getBoundingClientRect();
    algorithmMenu.style.width = `${anchor.width}px`;
    const below = innerHeight - anchor.bottom - 12;
    const above = anchor.top - 12;
    const openBelow = below >= algorithmMenu.getBoundingClientRect().height || below >= above;
    algorithmMenu.style.maxHeight = `${Math.min(420, Math.max(0, openBelow ? below : above))}px`;
    const rect = algorithmMenu.getBoundingClientRect();
    algorithmMenu.style.left = `${Math.max(8, Math.min(anchor.left, innerWidth - rect.width - 8))}px`;
    algorithmMenu.style.top = `${openBelow ? anchor.bottom + 4 : anchor.top - rect.height - 4}px`;
    const items = algorithmMenu.querySelectorAll('button');
    (focusLast ? items[items.length - 1] : items[0]).focus();
  }

  function showCopyToast(message, failure = false) {
    clearTimeout(copyToastTimer);
    copyToast?.remove();
    copyToast = document.createElement('div');
    copyToast.className = 'HiTableToast';
    copyToast.dataset.failure = String(failure);
    copyToast.setAttribute('role', failure ? 'alert' : 'status');
    copyToast.textContent = message;
    document.body.appendChild(copyToast);
    const anchor = overlayTable.getBoundingClientRect();
    const indicator = overlayTable.querySelector('.HiTableIntegrityIndicator');
    const bottom = Math.max(anchor.bottom, indicator?.getBoundingClientRect().bottom || anchor.bottom);
    const rect = copyToast.getBoundingClientRect();
    copyToast.style.left = `${Math.max(8, Math.min(anchor.left, innerWidth - rect.width - 8))}px`;
    copyToast.style.top = `${Math.max(8, Math.min(innerHeight - rect.height - 8,
      bottom + 12 + rect.height <= innerHeight ? bottom + 12 : anchor.top - rect.height - 12))}px`;
    copyToastTimer = setTimeout(() => { copyToast?.remove(); copyToast = null; }, failure ? 4500 : 2400);
  }

  window.HiTableHandleMouseDown = function(event) {
    pendingClick = pendingDoubleClick = false;
    try {
      const target = event.target instanceof Element ? event.target : null;
      const handle = target?.closest('.HiTableResizeHandle');
      if (handle && event.isPrimary && event.button === 0) {
        stopSelectionEvent(event);
        startResize(handle.dataset.corner, event);
        return;
      }
      if (target?.closest('.HiTableMenu, .HiTableAlgorithmButton')) return;
      closeAlgorithmMenu();
      const cell = selectableCell(event.target);
      if (event.isPrimary && event.button === 0 && cell && config.algorithm) {
        stopSelectionEvent(event);
        clearSelection();
        originalTable = getOutermostTable(cell);
        logicTable = new LogicTable(originalTable);
        captureTableSnapshot();
        startCell = logicTable.logicCell(cell);
        endCell = startCell;
        currentCell = startCell;
        activePointerId = event.pointerId;
        dragOrigin = {x: event.clientX, y: event.clientY};
        isMouseDown = true;
        pendingClick = true;
        document.documentElement.setPointerCapture(event.pointerId);
        if (event.shiftKey && startCell && startCell.row === 0 && startCell.col === 0) {
          endCell = logicTable.rows[logicTable.totalRows - 1][logicTable.totalCols - 1];
          dragStarted = true;
          selectCellsAndFillArray();
        }
      } else if (event.button === 0 && event.target instanceof Element &&
        !event.target.closest('.HiTableOverlay, .HiTableSelectionFrame')) {
        clearSelection();
      }
    } catch (error) {
      handleError('MouseDown', error);
      clearSelection();
    }
  }

  window.HiTableHandleMouseOver = function(event) {
    try {
      if (event.pointerId !== activePointerId) return;
      stopSelectionEvent(event);
      if (!(event.buttons & 1)) {
        if (resizeState) finishResize(true); else clearSelection();
        return;
      }
      updatePointerSelection(event);
    } catch (error) {
      handleError('MouseOver', error);
    }
  }

  window.HiTableHandleMouseUp = function(event) {
    try {
      if (event.pointerId === activePointerId) {
        stopSelectionEvent(event);
        updatePointerSelection(event);
        if (resizeState) { finishResize(!resizeState.moved); return; }
        releasePointer();
        if (!dragStarted) { clearSelection(); return; }
        showOverlay();
        calculation();
      } else if (pendingClick) {
        stopSelectionEvent(event);
      }
    } catch (error) {
      handleError('MouseUp', error);
      clearSelection();
    }
  }

  window.HiTableHandleKeyDown = function(event) {
    try {
      if (!isMouseDown) pendingClick = pendingDoubleClick = false;
      if (algorithmMenu) {
        const items = [...algorithmMenu.querySelectorAll('button')];
        const index = items.indexOf(document.activeElement);
        if (event.key === 'Escape') {
          stopSelectionEvent(event);
          closeAlgorithmMenu(true);
          return;
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          stopSelectionEvent(event);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          items[next].focus();
          return;
        }
        if (event.key === 'Tab') closeAlgorithmMenu(true);
      }
      const target = event.target instanceof Element ? event.target : null;
      const handle = target?.closest('.HiTableResizeHandle');
      if (handle && !isMouseDown && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        stopSelectionEvent(event);
        const corner = handle.dataset.corner;
        startResize(corner);
        endCell = {
          row: Math.max(0, Math.min(logicTable.totalRows - 1, endCell.row + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0))),
          col: Math.max(0, Math.min(logicTable.totalCols - 1, endCell.col + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0)))
        };
        finishResize(false);
        selectionFrame.querySelector(`[data-corner="${corner}"]`).focus();
        return;
      }
      const trigger = target?.closest('.HiTableAlgorithmButton');
      if (trigger && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
        stopSelectionEvent(event);
        openAlgorithmMenu(trigger.dataset.direction, trigger, event.key === 'ArrowUp');
        return;
      }
      if (!isMouseDown && event.target instanceof Element &&
        (event.target.closest('input, textarea') || event.target.isContentEditable)) return;
      if (event.key === 'Escape') {
        if (resizeState) {
          stopSelectionEvent(event);
          finishResize(true);
          return;
        }
        if (isMouseDown || overlayTable) stopSelectionEvent(event);
        clearSelection();
      }

      if (event.key.toLowerCase() === 'c' && (event.ctrlKey || event.metaKey)) {
        if (isMouseDown) { stopSelectionEvent(event); return; }
        let pressCtrlC = Date.now();
        // 复制选中的单元格数据
        let text;
        const includeStatistics = pressCtrlC - lastPressCtrlC < CONSTANTS.PERF.DOUBLE_CLICK_MS && overlayTable;
        if (includeStatistics) {
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
          text = selectedCellsData.map((row, r) => row.map((value, c) =>
            Number.isFinite(value) ? new Intl.NumberFormat(selectedCellsData._locales[r][c], {
              useGrouping: false, maximumSignificantDigits: 21
            }).format(value) : selectedCellsData._rawData[r][c]
          ).join('\t')).join('\n') + '\n';
        }

        if (text) {
          stopSelectionEvent(event);
          const rows = selectedCellsData.length;
          const columns = selectedCellsData[0].length;
          const request = ++clipboardRequest;
          Promise.resolve().then(() => navigator.clipboard.writeText(text)).then(() => {
            if (!disposed && request === clipboardRequest) showCopyToast(getMessage(
              includeStatistics ? 'copySuccessStatistics' : 'copySuccess', [String(rows), String(columns)]));
          }).catch(() => {
            if (!disposed && request === clipboardRequest) showCopyToast(getMessage('copyFailure'), true);
          });
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
      selectionListeners.push(
        ['pointerdown', window.HiTableHandleMouseDown],
        ['pointermove', window.HiTableHandleMouseOver],
        ['pointerup', window.HiTableHandleMouseUp],
        ['keydown', window.HiTableHandleKeyDown],
        ['click', event => {
          if (pendingClick) {
            pendingClick = false;
            pendingDoubleClick = true;
            stopSelectionEvent(event);
          }
        }],
        ['dblclick', event => {
          if (pendingDoubleClick) { pendingDoubleClick = false; stopSelectionEvent(event); }
        }],
        ['pointercancel', event => {
          if (event.pointerId === activePointerId) {
            stopSelectionEvent(event);
            if (resizeState) finishResize(true); else clearSelection();
            pendingClick = pendingDoubleClick = false;
          }
        }],
        ['lostpointercapture', event => {
          if (event.pointerId === activePointerId) {
            if (resizeState) finishResize(true); else clearSelection();
          }
        }],
        ['blur', event => {
          if (event.target !== window) return;
          if (isMouseDown) {
            if (resizeState) finishResize(true); else clearSelection();
          }
          pendingClick = pendingDoubleClick = false;
        }],
        ['resize', () => { closeAlgorithmMenu(); positionSelectionFrame(); }],
        ['transitionend', event => {
          if ((event.target === document.documentElement || event.target === document.body) &&
              event.propertyName === 'background-color') scheduleThemeRefresh();
        }],
        ['scroll', event => {
          if (!(event.target instanceof Node && algorithmMenu?.contains(event.target))) closeAlgorithmMenu();
        }]
      );
      // Pointer capture also emits boundary events when it retargets the pointer.
      // Consume those and compatibility mouse events only for our own gesture.
      for (const type of ['pointerover', 'pointerout', 'pointerenter', 'pointerleave',
        'mousedown', 'mousemove', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave', 'mouseup']) {
        selectionListeners.push([type, event => {
          if (isMouseDown || pendingClick) stopSelectionEvent(event);
        }]);
      }
      for (const [type, listener] of selectionListeners) window.addEventListener(type, listener, true);
      systemColorScheme.addEventListener('change', scheduleThemeRefresh);
      // Theme classes, data attributes and CSS variables live on these roots.
      // No subtree observer: selection rendering must not trigger theme work.
      backgroundObserver.observe(document.documentElement, { attributes: true });
      backgroundObserver.observe(document.body, { attributes: true });
      window.HiTableState.cleanup = () => {
        disposed = true;
        systemColorScheme.removeEventListener('change', scheduleThemeRefresh);
        backgroundObserver.disconnect();
        cancelAnimationFrame(themeRefreshFrame);
        for (const [type, listener] of selectionListeners) window.removeEventListener(type, listener, true);
        clearSelection();
      };

      // 引入外部样式表
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('../assets/main.css');
      link.id = 'HiTableCSS'; // Add an ID to the link element
      (document.head || document.documentElement).appendChild(link);
      
      loadConfig().then((newConfig) => {
        if (disposed) return;
        // 在这里，loadConfig 已经完成，你可以使用它的结果处理配置值
        // 覆盖全局默认配置
        config = newConfig;
        parseConfig(config);
        // 初始化非标准表格检测
        activateGridDetector();
      }).catch((error) => {
        if (disposed) return;
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
      themeMode: 'auto',
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
      return defaultConfig;
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
  function colorLuminance(rgb) {
    return rgb.reduce((sum, value, i) => {
      const channel = value / 255;
      return sum + (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
        * [0.2126, 0.7152, 0.0722][i];
    }, 0);
  }

  function pageBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const scheme = getComputedStyle(document.documentElement).colorScheme;
    context.fillStyle = scheme === 'dark' || (scheme.includes('dark') && systemColorScheme.matches)
      ? '#121212' : '#ffffff';
    context.fillRect(0, 0, 1, 1);
    for (const node of [document.documentElement, document.body]) {
      const style = getComputedStyle(node);
      context.fillStyle = style.backgroundColor;
      context.fillRect(0, 0, 1, 1);
      // Use gradient stops as a representative background, without sampling
      // table colours or our own selection and hover styles.
      const stops = style.backgroundImage.includes('gradient(') && !style.backgroundImage.includes('url(')
        ? style.backgroundImage.match(/rgba?\([^)]+\)/g) : null;
      if (stops?.length) {
        const backdrop = context.getImageData(0, 0, 1, 1);
        const sum = [0, 0, 0];
        for (const stop of stops) {
          context.putImageData(backdrop, 0, 0);
          context.fillStyle = stop;
          context.fillRect(0, 0, 1, 1);
          context.getImageData(0, 0, 1, 1).data.slice(0, 3).forEach((value, i) => sum[i] += value);
        }
        context.fillStyle = `rgb(${sum.map(value => Math.round(value / stops.length)).join(',')})`;
        context.fillRect(0, 0, 1, 1);
      }
    }
    return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
  }

  function scheduleThemeRefresh() {
    if (themeRefreshFrame) return;
    themeRefreshFrame = requestAnimationFrame(() => {
      themeRefreshFrame = null;
      applySelectionTheme();
    });
  }

  function applySelectionTheme() {
    let color = config.boxColor || '#27ae60';
    // Appearance follows the live page; data and geometry keep their snapshot.
    const background = pageBackground();
    if (config.themeMode === 'auto') {
      const [r, g, b] = background.map(value => value / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
      const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(max + min - 1));
      const hue = delta === 0 ? 0 : ((max === r ? (g - b) / delta
        : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60 + 360) % 360;
      const softBeige = hue >= 30 && hue <= 70 && delta < 0.22 && colorLuminance(background) > 0.6;
      color = saturation < 0.4 || softBeige ? '#746b5e'
        : hue < 20 || hue >= 345 ? '#c0392b' : hue < 45 ? '#d35400'
        : hue < 70 ? '#f39c12' : hue < 160 ? '#27ae60' : hue < 190 ? '#16a085'
        : hue < 255 ? '#2980b9' : hue < 295 ? '#8e44ad' : '#c2185b';
    }
    let theme = window.HiTableThemes[color] || window.HiTableThemes['#27ae60'];
    const dark = colorLuminance(background) < 0.18;
    if (dark) theme = theme.dark;
    const surfaceRGB = [1, 3, 5].map(index => parseInt(theme.surface.slice(index, index + 2), 16));
    let style = document.getElementById(CONSTANTS.CSS.STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = CONSTANTS.CSS.STYLE_ID;
      document.head.appendChild(style);
    }
    const css = `:root {
      --hitable-color-scheme: ${dark ? 'dark' : 'light'};
      --hitable-theme-rgb: ${surfaceRGB.join(',')};
      --hitable-surface: ${theme.surface}; --hitable-ink: ${theme.ink};
      --hitable-band: ${theme.band}; --hitable-band-ink: ${theme.bandInk};
      --hitable-highlight: ${theme.highlight}; --hitable-highlight-ink: ${theme.highlightInk};
      --hitable-muted: ${dark ? '#3b3b3b' : '#d2d2d2'};
      --hitable-muted-ink: ${dark ? '#b0b0b0' : '#484848'};
      --hitable-grid: ${dark ? '#ffffff40' : 'color-mix(in srgb, #fff 65%, transparent)'};
      --hitable-menu-surface: ${dark ? '#252525' : '#ffffff'};
      --hitable-menu-ink: ${dark ? '#f3f3f3' : '#29313a'};
      --hitable-menu-selected-ink: ${dark ? '#f3f3f3' : theme.highlight};
      --hitable-menu-muted-ink: ${dark ? '#bdbdbd' : '#606a73'};
      --hitable-menu-separator: ${dark ? '#484848' : '#e2e5e8'};
      --hitable-menu-focus: ${dark ? theme.highlight : theme.band};
    }`;
    if (style.textContent !== css) style.textContent = css;
  }

  // Configuration changes re-render data from the same snapshot.
  function parseConfig(config) {
    if (disposed) return;
    applySelectionTheme();
    if (config && config.algorithm && overlayTable) {
      if (resizeState) finishResize(true);
      deselectAllCells();
      selectCellsAndFillArray();
      showOverlay();
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
    closeAlgorithmMenu();
    selectionFrame?.remove();
    selectionFrame = null;
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
    const locales = [];
    selectedCellsData = Array.from({ length: bottom - top + 1 }, (_, r) => {
      rawData[r] = [];
      locales[r] = [];
      return Array.from({ length: right - left + 1 }, (_, c) => {
        let logicCell = logicTable.cell(top + r, left + c);
        if (!logicCell) return NaN;
        let cell = logicTable.actualCell(logicCell);
        if (!cell) return NaN;
        let rawText = cellText(cell);
        rawData[r][c] = rawText;
        const parsed = parseNumericText(rawText);
        let value = parsed ? parsed.value : NaN;
        locales[r][c] = parsed ? parsed.locale : numberLocale();
        if (!Number.isFinite(value)) {
          cell.setAttribute(CONSTANTS.ATTRS.CELL_ISNAN, 'true');
        } else {
          cell.removeAttribute(CONSTANTS.ATTRS.CELL_ISNAN);
        }
        // 高亮单元格
        cell.setAttribute(CONSTANTS.ATTRS.CELL_SELECTED, 'true');
        return value;
      });
    });
    selectedCellsData._locales = locales;
    selectedCellsData._rawData = rawData;

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
        const value = parseNumber(cellText(logicCell.cell));
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
          reasons.push(getMessage('anomalyReasonGlobal', [
            Number(value).toFixed(2), Number(avg).toFixed(2), Number(anomalyThreshold).toFixed(2)
          ]));
        }
        if (colStats[c] && colStats[c].std > 0 && Math.abs(value - colStats[c].avg) > colStats[c].threshold) {
          reasons.push(getMessage('anomalyReasonColumn', [Number(colStats[c].avg).toFixed(2)]));
        }
        if (rowStats[r] && rowStats[r].std > 0 && Math.abs(value - rowStats[r].avg) > rowStats[r].threshold) {
          reasons.push(getMessage('anomalyReasonRow', [Number(rowStats[r].avg).toFixed(2)]));
        }
        actualCell.setAttribute('data-anomaly-reason', reasons.join('\n'));
        actualCell.title = getMessage('anomalyTitle') + '\n' + reasons.join('\n');
      }
    });

    selectedCellsData._stats = { avg, std, anomalyThreshold, count: allValues.length };
  }
  // 解析数字
  // The table language describes its numbers; the UI language may be different.
  function numberLocale() {
    if (config.numberFormat === 'comma') return 'ro-RO';
    if (config.numberFormat === 'dot') return 'en-US';
    const language = tableSnapshot ? tableSnapshot.language
      : originalTable?.closest('[lang]')?.getAttribute('lang');
    return language && /^[a-z]{2,3}(?:-[a-z]{4})?(?:-(?:[a-z]{2}|\d{3}))?$/i.test(language)
      && Intl.NumberFormat.supportedLocalesOf(language).length
      ? language : navigator.language;
  }

  function parseNumber(text) {
    const parsed = parseNumericText(text);
    return parsed ? parsed.value : NaN;
  }

  // One parser supplies both calculations and their currency/precision metadata.
  function parseNumericText(text) {
    text = text.trim().replace(/[０-９]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
    ).replace(/，/g, ',').replace(/．/g, '.');

    const currencyMatch = text.match(/^([+-]?)\s*(HK\$|NT\$|RON|MDL|lei|leu|[$€£¥₽₹])\s*|\s*(HK\$|NT\$|RON|MDL|lei|leu|[$€£¥₽₹])$/i);
    const currency = currencyMatch ? (currencyMatch[2] || currencyMatch[3]) : '';
    const currencyPosition = currencyMatch?.[2] ? 'prefix' : 'suffix';
    if (currencyMatch) {
      const sign = currencyMatch[2] ? currencyMatch[1] : '';
      text = sign + text.replace(currencyMatch[0], '').trim();
    }

    const isPercentage = text.endsWith('%');
    if (isPercentage) text = text.slice(0, -1).trim();
    const magnitudes = { '万亿': 1e12, '亿': 1e8, '万': 1e4, K: 1e3, W: 1e4, M: 1e6, B: 1e9 };
    const magnitudeMatch = text.match(/(万亿|亿|万|[KWMB])$/i);
    const magnitudeSuffix = magnitudeMatch ? magnitudeMatch[0].toUpperCase() : '';
    const magnitude = magnitudes[magnitudeSuffix] || 1;
    if (magnitudeMatch) text = text.slice(0, -magnitudeMatch[0].length).trim();

    let locale = numberLocale();
    const localeDecimal = new Intl.NumberFormat(locale).formatToParts(1.1)
      .find(part => part.type === 'decimal').value;
    // The parser accepts Latin digits with dot/comma separators. Keep the
    // existing dot convention for locales whose native separator is different.
    let decimal = localeDecimal === ',' ? ',' : '.';
    if (!config.numberFormat || config.numberFormat === 'auto') {
      const dot = text.lastIndexOf('.');
      const comma = text.lastIndexOf(',');
      if (dot >= 0 && comma >= 0) {
        // Both separators make the decimal position unambiguous.
        decimal = dot > comma ? '.' : ',';
      } else {
        const separator = dot >= 0 ? '.' : comma >= 0 ? ',' : '';
        const parts = separator ? text.split(separator) : [];
        if (parts.length === 2 && parts[1].length !== 3) decimal = separator;
        if (parts.length > 2) decimal = separator === '.' ? ',' : '.';
        // A single separator followed by three digits follows the table/browser
        // locale. The explicit setting lets users resolve ambiguous values.
      }
    }
    if (decimal !== localeDecimal) locale = decimal === ',' ? 'ro-RO' : 'en-US';
    const group = decimal === ',' ? '.' : ',';
    const escapedDecimal = decimal === '.' ? '\\.' : ',';
    const integer = `(?:\\d+|\\d{1,3}(?:[${group} \\u00a0\\u202f]\\d{3})+|\\d{1,2}(?:[${group}]\\d{2})+[${group}]\\d{3})`;
    if (!new RegExp(`^[-+]?(?:${integer}(?:${escapedDecimal}\\d+)?|${escapedDecimal}\\d+)$`).test(text)) return null;
    const precision = text.includes(decimal) ? text.length - text.lastIndexOf(decimal) - 1 : 0;
    const normalized = text.replace(new RegExp(`[${group} \\u00a0\\u202f]`, 'g'), '').replace(decimal, '.');
    let value = Number(normalized) * magnitude;
    if (isPercentage) value /= 100;
    return { value, precision, currency, currencyPosition, magnitudeSuffix, locale };
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
        const rawText = cellText(cell.cell);

        const parsed = parseNumericText(rawText);
        if (!parsed) continue;
        if (parsed.currency) {
          currencyCount++;
          const symbol = parsed.currency;
          currencySymbols[symbol] = (currencySymbols[symbol] || 0) + 1;
        }

        if (rawText.endsWith('%')) {
          percentCount++;
        }

        const numValue = parsed.value;
        if (!isNaN(numValue)) {
          numericCount++;
          if (parsed.precision > 0) {
            decimalCount++;
            totalPrecision += parsed.precision;
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
   * @returns {Object} Column formats relative to the selection.
   */
  function detectColumnFormats(rawData) {
    const formats = {};
    const colCount = rawData[0]?.length || 0;
    for (let c = 0; c < colCount; c++) {
      const texts = rawData.map(row => row[c]).filter(t => t && t.trim());
      if (texts.length < 2) continue;
      const fmt = detectFormat(texts);
      if (fmt.locale) {
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
      if (fmt.locale) {
        formats[r] = fmt;
      }
    }
    return formats;
  }

  /**
   * 从一组文本中检测通用前缀/后缀
   * @returns {{ prefix: string, currencySuffix: string, suffix: string, divisor: number, locale: string | undefined }}
   */
  function detectFormat(texts) {
    const currencies = {};
    const suffixes = {};
    const parsed = texts.map(parseNumericText).filter(Boolean);
    parsed.forEach(cell => {
      if (cell.currency) {
        const key = cell.currencyPosition + ':' + cell.currency;
        currencies[key] = (currencies[key] || 0) + 1;
      }
      if (cell.magnitudeSuffix) {
        suffixes[cell.magnitudeSuffix] = (suffixes[cell.magnitudeSuffix] || 0) + 1;
      }
    });

    let prefix = '';
    let currencySuffix = '';
    for (const [key, count] of Object.entries(currencies)) {
      if (count > texts.length * 0.5) {
        const [position, symbol] = key.split(':');
        if (position === 'prefix') prefix = symbol + (/^[a-z]+$/i.test(symbol) ? ' ' : '');
        else currencySuffix = ' ' + symbol;
      }
    }
    let suffix = '';
    const suffixMap = { K: 1000, W: 10000, '万': 10000, M: 1000000, '亿': 100000000, '万亿': 1000000000000, B: 1000000000 };
    for (const [symbol, count] of Object.entries(suffixes)) {
      if (count > texts.length * 0.5) suffix = symbol;
    }
    return { prefix, currencySuffix, suffix, divisor: suffixMap[suffix] || 1, locale: parsed[0]?.locale };
  }

  /** 用源数据的小数格式和货币位置显示结果。 */
  function formatValue(value, fmt, includeUnits = true) {
    const divisor = includeUnits ? fmt.divisor : 1;
    const formatted = new Intl.NumberFormat(fmt.locale, {
      useGrouping: /RON|MDL|le[ui]/i.test(fmt.prefix + fmt.currencySuffix),
      ...(divisor > 1 ? { maximumFractionDigits: 2 } : { maximumSignificantDigits: 21 })
    }).format(value / divisor);
    return includeUnits ? fmt.prefix + formatted + fmt.suffix + fmt.currencySuffix : formatted;
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
    closeAlgorithmMenu();
    const [top, left, bottom, right] = getSelectedRect();

    // 计算外延区域的边界
    const topLeft = logicTable.cell(top, left);
    const bottomRight = logicTable.cell(bottom, right);
    const topLeftRect = tableSnapshot.cells.get(topLeft.cell).rect;

    // 选择区域的显示边界
    const leftBound = topLeftRect.left;
    const topBound = topLeftRect.top;

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
    positionSelectionFrame();
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
      const cell = event.target.closest('td');
      if (cell && table.contains(cell)) {
        // 清除所有单元格的状态（使用缓存）
        clearAllHighlights();

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
      const direction = cell.querySelector('.HiTableAlgorithmButton').dataset.direction;
      return [cell, ...[...table.querySelectorAll(`.HiTableOverlay-${direction}`)]
        .filter(statistic => !statistic.querySelector('.HiTableAlgorithmButton'))];
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

    // Keep overlay controls from reaching the page's delegated table handlers.
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'mousedown', 'mousemove', 'mouseover', 'mouseup', 'click', 'dblclick', 'keydown']) {
      overlayTable.addEventListener(type, event => event.stopPropagation());
    }

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

    let prevDomCell = null;
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
        prevDomCell = clone;
      } else if (prevDomCell !== null) {
        // 如果当前单元格为空，那么将前一个 DOM 单元格的 colSpan 加 1
        prevDomCell.colSpan = (prevDomCell.colSpan || 1) + 1;
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
    const snapshot = tableSnapshot.cells.get(actualCell);
    const cellWidth = cell.width();
    const cellHeight = cell.height();

    // 获取原单元格的样式
    const [paddingTop, paddingRight, paddingBottom, paddingLeft] = snapshot.padding.map(value => parseFloat(value) || 0);

    // 创建新单元格
    const newCell = document.createElement('td');

    // 使用 box-sizing: border-box 确保设置的宽高就是最终显示尺寸
    newCell.style.boxSizing = 'border-box';
    newCell.style.width = `${cellWidth}px`;
    newCell.style.height = `${cellHeight}px`;
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
        newCell.title = getMessage('anomalyTitle') + '\n' + reason;
      }
    }

    // 创建内容 div（去除交互元素）
    const div = document.createElement('div');
    div.style.padding = `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`;
    if (withContent) {
      newCell.classList.add('HiTableDataCell');
      div.textContent = snapshot.text;
      const valueTitle = newCell.hasAttribute('cell-isNaN')
        ? getMessage('nonNumericCell') + '\n' + snapshot.text : snapshot.text;
      newCell.title = newCell.title ? newCell.title + '\n' + valueTitle : valueTitle;
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
      cell.classList.remove('HiTableDataCell');
      cell.querySelector('div').style.padding = '4px 8px';
      if (cell.classList.contains(CONSTANTS.CSS.OVERLAY_TOP) || cell.classList.contains(CONSTANTS.CSS.OVERLAY_BOTTOM)) cell.style.height = '38px';
      cell.removeAttribute(CONSTANTS.ATTRS.CELL_SELECTED);
      cell.removeAttribute(CONSTANTS.ATTRS.CELL_ISNAN);
      cell.removeAttribute('cell-anomaly');
    });

    const leftRightCells = overlayTable.querySelectorAll('.HiTableOverlay-left div, .HiTableOverlay-right div');
    leftRightCells.forEach(div => {
      div.style.maxWidth = div.style.width;
      div.style.width = 'auto';
    });

    // Fixed source column widths keep long labels/results from moving the data grid.
    const [top, left, bottom, right] = getSelectedRect();
    const widths = [120];
    for (let col = left; col <= right; col++) widths.push(LogicCell.colWidths[col]);
    widths.push(120);
    const group = document.createElement('colgroup');
    for (const width of widths) {
      const col = document.createElement('col');
      col.style.width = `${width}px`;
      group.appendChild(col);
    }
    overlayTable.prepend(group);
    overlayTable.style.tableLayout = 'fixed';
    overlayTable.style.width = `${widths.reduce((sum, width) => sum + width, 0)}px`;
    for (const row of overlayTable.rows) {
      row.style.height = `${row.rowIndex === 0 || row.rowIndex === overlayTable.rows.length - 1
        ? 38 : LogicCell.rowHeights[top + row.rowIndex - 1]}px`;
    }
    const rect = overlayTable.getBoundingClientRect();
    // Keep small overlays and their outer controls on screen; preserve alignment when there is room.
    const leftBound = parseFloat(overlayTable.style.left) - widths[0];
    const topBound = parseFloat(overlayTable.style.top) - overlayTable.rows[0].getBoundingClientRect().height;
    overlayTable.style.left = `${scrollX + Math.max(8, Math.min(leftBound - scrollX,
      Math.max(8, innerWidth - rect.width - 8)))}px`;
    overlayTable.style.top = `${scrollY + Math.max(8, Math.min(topBound - scrollY,
      Math.max(8, innerHeight - rect.height - 8)))}px`;

    for (let i = 0; i < directions.length; i++) {
      const direction = directions[i];
      const corner = getCorner(overlayTable, direction);
      const div = corner.querySelector('div');
      div.textContent = '';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'HiTableAlgorithmButton';
      button.dataset.direction = direction;
      button.setAttribute('aria-haspopup', 'menu');
      button.setAttribute('aria-expanded', 'false');
      button.appendChild(document.createElement('span'));
      button.addEventListener('click', () => openAlgorithmMenu(direction, button));
      div.appendChild(button);
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
        const button = corner.querySelector('.HiTableAlgorithmButton');
        button.querySelector('span').textContent = algorithmNames[algorithm];
        button.title = getMessage('algorithmTitle', [getMessage('direction_' + direction), algorithmNames[algorithm]]);
        button.setAttribute('aria-label', button.title);
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
                const numeric = data.filter(Number.isFinite);
                value = numeric.length || algorithm === 'CNT' ? statistics[algorithm](numeric) : NaN;
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

                title = getMessage('statisticsTitle', [isColumn ? getMessage('column') : getMessage('row'), index, algorithmNames[algorithm], value]);
                // 附加列类型标注
                if (isColumn) {
                  const colType = columnTypes.find(ct => ct.col === (left + index - 1));
                  if (colType) {
                    let typeHint = '';
                    switch (colType.type) {
                      case 'integer': typeHint = ' [' + getMessage('colTypeInteger') + ']'; break;
                      case 'currency': typeHint = ' [' + getMessage('colTypeCurrency') + (colType.currencySymbol ? ': ' + colType.currencySymbol : '') + ']'; break;
                      case 'percentage': typeHint = ' [' + getMessage('colTypePercentage') + ']'; break;
                      case 'decimal': typeHint = ' [' + getMessage('colTypeDecimal') + (colType.avgPrecision ? ' (' + colType.avgPrecision + ' ' + getMessage('colTypeDp') + ')' : '') + ']'; break;
                    }
                    title += typeHint;
                  }
                }
              } else {
                handleError('calculation', new Error(`Unknown algorithm: ${algorithm}`));
                value = 'N/A';
                title = getMessage('unknownAlgorithm') + algorithm;
              }
            }

            // 格式化显示值（保留货币前缀/数量级后缀）
            // 注意：CNT（计数）、VAR（方差平方单位）、SKW/KUR（无量纲）不应继承格式
            var NO_FORMAT_ALGORITHMS = ['CNT', 'VAR', 'SKW', 'KUR'];
            let displayValue = value;
            if (typeof value === 'number' && isFinite(value)) {
              const fmt = isColumn ? selectedCellsData._columnFormats[index - 1]
                : selectedCellsData._rowFormats[index - 1];
              if (fmt) displayValue = formatValue(value, fmt, !NO_FORMAT_ALGORITHMS.includes(algorithm));
            }

            div.textContent = typeof displayValue === 'number' && !Number.isFinite(displayValue) ? '—' : displayValue;
            div.title = typeof value === 'number' && !Number.isFinite(value) ? getMessage('noNumericData') : title;
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
          columnLabels.push(headerCell ? cellText(headerCell.cell) : '');
        }

        // 收集原始文本数据（用于文本方式的末位数字检测）
        for (let r = top; r <= bottom; r++) {
          const rawRow = [];
          for (let c = left; c <= right; c++) {
            const cell = logicTable.cell(r, c);
            rawRow.push(cell ? cellText(cell.cell) : '');
          }
          rawData2D.push(rawRow);
        }

        const integrityResults = window.HiTableDataIntegrity.analyze(selectedCellsData, columnLabels, rawData2D);
        if (integrityResults && integrityResults.flagCount > 0) {
          const summaryItems = window.HiTableDataIntegrity.generateSummary(integrityResults, getMessage);
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
    text.textContent = summaryItems.length + ' ' + getMessage('integrityIssuesFound');
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
        const rawText = cellText(actualCell);
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
          if (window.HiTableDataIntegrity.lastDigitFromText(rawText) === dominantLastDigit) {
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
