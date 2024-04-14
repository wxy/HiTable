const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = chrome.runtime.getURL('../src/assets/main.css');
(document.head || document.documentElement).appendChild(link);

let startCell = null;
let endCell = null;
let currentCell = null;
let isMouseDown = false;
let selectedCellsData = [];
let overlayTables = {};

// 阻止默认的表格选择
window.addEventListener('mousedown', (event) => {
  if(event.target.tagName.toLowerCase() === 'td') {
    event.preventDefault();
  }
});

// Mouse down event
document.addEventListener('mousedown', (event) => {
  if (event.button === 0 && event.target.tagName.toLowerCase() === 'td') {
    deleteAllCellSelected(); // 删除所有选择
    Object.values(overlayTables).forEach((table) => {
        while (table.firstChild) {
          table.firstChild.remove();
        }
      });
    isMouseDown = true;
    startCell = event.target;
    endCell = event.target;
    startCell.setAttribute('cell-selected', 'true');
  }
});

// Mouse over event to highlight cell during mouse down and moving over
document.addEventListener('mouseover', (event) => {
    if (isMouseDown && event.target.tagName.toLowerCase() === 'td' && event.target !== currentCell) {
      endCell = event.target;
      // 每当鼠标移动时，先删除所有被高亮的单元格
      deleteAllCellSelected();
      currentCell = endCell;
  
      // 高亮所有待选单元格
      selectCellsAndFillArray(startCell, endCell);
    }
  });

// Mouse up event
document.addEventListener('mouseup', (event) => {
  if (isMouseDown && event.target.tagName.toLowerCase() === 'td') {
    isMouseDown = false;
    selectCellsAndFillArray(startCell, endCell);
    showOverlay(startCell, endCell);
  }
  console.log(selectedCellsData);
});


function selectCellsAndFillArray(start, end) {
  let cells = getCellsInRectangle(start, end);
  let cellValues = cells.map(cell => cell.innerText);
  selectedCellsData = [];
  while (cellValues.length) selectedCellsData.push(cellValues.splice(0, Math.abs(start.cellIndex - end.cellIndex) + 1)); 
  cells.forEach(cell => cell.setAttribute('cell-selected', 'true'));
}

// Function to delete all cell-selected attributes
function deleteAllCellSelected() {
  Array.from(document.getElementsByTagName('td')).forEach(td => td.removeAttribute('cell-selected'));
}

// Function to get cells in specified rectangle
function getCellsInRectangle(start, end) {
    const startRowIndex = getRowIndex(start);
    const startCellIndex = getCellIndex(start);
    const endRowIndex = getRowIndex(end);
    const endCellIndex = getCellIndex(end);
  
    const top = Math.min(startRowIndex, endRowIndex);
    const bottom = Math.max(startRowIndex, endRowIndex);
    const left = Math.min(startCellIndex, endCellIndex);
    const right = Math.max(startCellIndex, endCellIndex);
    const selectedCells = [];
  
    let parentTable = start.parentElement.parentElement; // 获取单元格的父级表格
  
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        selectedCells.push(parentTable.rows[r].cells[c]);
      }
    }
  
    return selectedCells;
  }

  function getRowIndex(cell) {
    return Array.from(cell.parentElement.parentElement.rows).indexOf(cell.parentElement);
  }
  
  function getCellIndex(cell) {
    return Array.from(cell.parentElement.cells).indexOf(cell);
  }

function showOverlay(start, end) {
    // 如果 start 和 end 是同一个单元格，则无需运行
    if (start === end) {
        return;
    }

    // 计算外延区域的边界
    const startRect = start.getBoundingClientRect();
    const endRect = end.getBoundingClientRect();
    const startStyle = window.getComputedStyle(start);
    const endStyle = window.getComputedStyle(end);

    const startBorderWidth = parseFloat(startStyle.borderWidth);
    const endBorderWidth = parseFloat(endStyle.borderWidth);

    const left = Math.min(startRect.left + window.scrollX - startBorderWidth, endRect.left + window.scrollX - endBorderWidth);
    const right = Math.max(startRect.right + window.scrollX - startBorderWidth, endRect.right + window.scrollX - endBorderWidth);
    const top = Math.min(startRect.top + window.scrollY - startBorderWidth, endRect.top + window.scrollY - endBorderWidth);
    const bottom = Math.max(startRect.bottom + window.scrollY - startBorderWidth, endRect.bottom + window.scrollY - endBorderWidth);


    // 获取相邻的外边单元格
    const adjacentCells = getAdjacentCells(start, end);

    // 清空 overlayTables 内容
    Object.values(overlayTables).forEach((table) => {
        while (table.firstChild) {
            table.firstChild.remove();
        }
    });

    // 创建覆盖表格并添加相邻的外边单元格
    createOverlayTable('top', left, top - start.offsetHeight, adjacentCells.topRow);
    createOverlayTable('bottom', left, bottom, adjacentCells.bottomRow);
    createOverlayTable('left', left - start.offsetWidth, top, adjacentCells.leftColumn);
    createOverlayTable('right', right, top, adjacentCells.rightColumn);
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
    const cells = [];
    for (let i = startCellIndex; i <= endCellIndex; i++) {
      cells.push(row.cells[i]);
    }
    return cells;
  }
  
  function getCellsInColumn(table, columnIndex, startRowIndex, endRowIndex) {
    const cells = [];
    for (let i = startRowIndex; i <= endRowIndex; i++) {
      cells.push(table.rows[i].cells[columnIndex]);
    }
    return cells;
  }

  // 创建覆盖表格并添加单元格
  function createOverlayTable(direction, left, top, cells) {
    if (!overlayTables[direction]) {
    const table = document.createElement('table');
      table.setAttribute('border', '1');
      table.style.position = 'absolute';
      table.style.borderCollapse = 'collapse';
      document.body.appendChild(table);
      overlayTables[direction] = table;
    }
  
    const copiedCells = copyCells(cells);
    appendToTable(overlayTables[direction], copiedCells);
  
    overlayTables[direction].style.left = `${left}px`;
    overlayTables[direction].style.top = `${top}px`;
  }
  
// 复制单元格
function copyCells(cells) {
    const copiedCells = [];
    const isRow = cells[0].parentElement === cells[1].parentElement; // 判断是否为一行
    const borderWidth = parseFloat(window.getComputedStyle(cells[0]).borderWidth); // 获取单元格边线宽度
    if (isRow) {
        const tr = document.createElement('tr');
        cells.forEach((cell, index) => {
            const clone = cell.cloneNode(true);
            clone.textContent = " "; // 复制原单元格的文本内容
            clone.style.width = `${cell.offsetWidth - (index === cells.length - 1 ? borderWidth : 2 * borderWidth)}px`; // 设置复制单元格的宽度，减去两个边线宽度
            clone.style.height = `${cell.offsetHeight - 2 * borderWidth}px`; // 设置复制单元格的高度
            clone.style.backgroundColor = 'rgba(255, 0, 0, 1)';
            tr.appendChild(clone);
        });
        copiedCells.push(tr);
    } else {
        cells.forEach((cell, index) => {
            const tr = document.createElement('tr');
            const clone = cell.cloneNode(true);
            clone.textContent = " "; // 复制原单元格的文本内容
            clone.style.width = `${cell.offsetWidth - 2 * borderWidth}px`; // 设置复制单元格的宽度
            clone.style.height = `${cell.offsetHeight - (index === cells.length - 1 ? borderWidth : 2 * borderWidth)}px`; // 设置复制单元格的高度，减去两个边线宽度
            clone.style.backgroundColor = 'rgba(255, 0, 0, 1)';
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
