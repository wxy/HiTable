/**
 * HiTable - 逻辑表格类库
 * 将 HTML 表格转换为扁平化的逻辑表格结构
 * 处理合并单元格和嵌套表格
 * 
 * 算法思路：自顶向下、逐步展开
 * 1. 从顶层表格开始，创建初始逻辑网格
 * 2. 遇到需要展开的单元格时，扩展所在的行/列
 * 3. 受影响的单元格会被复制填充到新增的位置
 */

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
    
    /** @type {HTMLTableElement} */
    this.originalTable = table;
    /** @type {LogicCell[][]} 逻辑表格二维数组 */
    this.rows = [];
    /** @type {WeakMap<HTMLTableCellElement, LogicCell[]>} DOM 单元格到逻辑单元格的映射 */
    this.cellMap = new WeakMap();
    /** @type {number} */
    this.totalRows = 0;
    /** @type {number} */
    this.totalCols = 0;
    
    this._generate();
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
    console.log('LogicTable generated:', this.totalRows, 'x', this.totalCols);
    for (let r = 0; r < this.rows.length; r++) {
      let rowStr = `Row ${r}: `;
      for (let c = 0; c < (this.rows[r]?.length || 0); c++) {
        let cell = this.rows[r][c];
        rowStr += cell ? `[${cell.cell.innerText.substring(0,6).replace(/\n/g,' ')}]` : '[null]';
      }
      console.log(rowStr);
    }
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
// 辅助函数
// ==========================================

/**
 * 获取包含给定元素的最外层表格
 */
function getOutermostTable(element) {
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

// 导出（用于模块化环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LogicCell, LogicTable, getOutermostTable };
}
