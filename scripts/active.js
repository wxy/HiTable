var startCell = null;
var endCell = null;
var originalTable = null;
var currentCell = null;
var isMouseDown = false;
var selectedCellsData = [];
var overlayTables = {};

// Mouse down event
window.HiTableHandleMouseDown = function(event) {
  if (event.button === 0 && event.target.tagName.toLowerCase() === 'td') {
    // 阻止默认的表格选择
    event.preventDefault();
    deleteAllCellSelected(); // 删除所有选择
    Object.values(overlayTables).forEach((table) => {
        while (table.firstChild) {
          table.firstChild.remove();
        }
      });
    isMouseDown = true;
    startCell = event.target;
    endCell = event.target;
    originalTable = startCell.closest('table');
    startCell.setAttribute('cell-selected', 'true');
  }
}

window.HiTableHandleMouseOver = function(event) {
  if (isMouseDown && event.target.tagName.toLowerCase() === 'td' && event.target !== currentCell) {
    endCell = event.target;
    // 每当鼠标移动时，先删除所有被高亮的单元格
    deleteAllCellSelected();
    currentCell = endCell;

    // 高亮所有待选单元格
    selectCellsAndFillArray(startCell, endCell);
  }
}

window.HiTableHandleMouseUp = function(event) {
  if (isMouseDown && event.target.tagName.toLowerCase() === 'td') {
    isMouseDown = false;
    selectCellsAndFillArray(startCell, endCell);
    showOverlay(startCell, endCell);
  }
  calculation();
}

document.addEventListener('mousedown', window.HiTableHandleMouseDown);
document.addEventListener('mouseover', window.HiTableHandleMouseOver);
document.addEventListener('mouseup', window.HiTableHandleMouseUp);

var link = document.createElement('link');
link.rel = 'stylesheet';
link.href = chrome.runtime.getURL('../src/assets/main.css');
link.id = 'HiTableCSS'; // Add an ID to the link element
(document.head || document.documentElement).appendChild(link);


function selectCellsAndFillArray(start, end) {
  let cells = getCellsInRectangle(start, end);
  let cellValues = cells.map(cell => {
    const value = parseFloat(cell.innerText);
    return isNaN(value) ? 0 : value;
  });
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

  const left = Math.min(startRect.left + window.scrollX, endRect.left + window.scrollX);
  const right = Math.max(startRect.right + window.scrollX, endRect.right + window.scrollX);
  const top = Math.min(startRect.top + window.scrollY, endRect.top + window.scrollY);
  const bottom = Math.max(startRect.bottom + window.scrollY, endRect.bottom + window.scrollY);

  // 获取相邻的外边单元格
  const adjacentCells = getAdjacentCells(start, end);

  // 清空 overlayTables 内容
  Object.values(overlayTables).forEach((table) => {
    while (table.firstChild) {
        table.firstChild.remove();
    }
  });
  
  // 创建覆盖表格并添加相邻的外边单元格
  if (adjacentCells.leftColumn.length > 1) {
    createOverlayTable('top', left, top - start.offsetHeight, adjacentCells.topRow);
    createOverlayTable('bottom', left, bottom, adjacentCells.bottomRow);
  }
  if (adjacentCells.topRow.length > 1) {
    createOverlayTable('left', left - start.offsetWidth, top, adjacentCells.leftColumn);
    createOverlayTable('right', right, top, adjacentCells.rightColumn);
  }
  if (adjacentCells.leftColumn.length > 1 && adjacentCells.topRow.length > 1) {
    // 创建四个角的覆盖表格
    createOverlayTable('topLeft', left - start.offsetWidth, top - start.offsetHeight, [adjacentCells.topRow[0]]);
    createOverlayTable('bottomLeft', left - start.offsetWidth, bottom, [adjacentCells.bottomRow[0]]);
    createOverlayTable('topRight', right, top - end.offsetHeight, [adjacentCells.topRow[adjacentCells.topRow.length - 1]]);
    createOverlayTable('bottomRight', right, bottom, [adjacentCells.bottomRow[adjacentCells.bottomRow.length - 1]]);
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
    appendToTable(overlayTables[direction], copyCells(cells));
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

function calculation() {
    // 计算每行的平均值和累加值
    const rowAverages = selectedCellsData.map(row => row.reduce((a, b) => a + b, 0) / row.length);
    const rowSums = selectedCellsData.map(row => row.reduce((a, b) => a + b, 0));

    // 计算每列的平均值和累加值
    const columnAverages = selectedCellsData[0].map((_, i) => selectedCellsData.reduce((a, row) => a + (row[i] || 0), 0) / selectedCellsData.length);
    const columnSums = selectedCellsData[0].map((_, i) => selectedCellsData.reduce((a, row) => a + (row[i] || 0), 0));

    // 将平均值和累加值放入相应的浮层单元格中
    overlayTables.left.querySelectorAll('td').forEach((td, i) => {
        const div = td.querySelector('div'); // Get the existing div element
        div.textContent = rowAverages[i]; // Update the content of the div with the row average value
        div.title = `Row ${i + 1} average: ${rowAverages[i]}`; // Set the title attribute of the div
    });
    overlayTables.bottomLeft.querySelector('div').textContent = 'A↑';

    overlayTables.right.querySelectorAll('td').forEach((td, i) => {
        const div = td.querySelector('div'); // Get the existing div element
        div.textContent = rowSums[i]; // Update the content of the div with the row sum value
        div.title = `Row ${i + 1} sum: ${rowSums[i]}`; // Set the title attribute of the div
    });
    overlayTables.topRight.querySelector('div').textContent = 'S↓';
    
    overlayTables.top.querySelectorAll('td').forEach((td, i) => {
        const div = td.querySelector('div'); // Get the existing div element
        div.textContent = columnAverages[i]; // Update the content of the div with the column average value
        div.title = `Column ${i + 1} average: ${columnAverages[i]}`; // Set the title attribute of the div
    });
    overlayTables.topLeft.querySelector('div').textContent = 'A→';
    
    overlayTables.bottom.querySelectorAll('td').forEach((td, i) => {
        const div = td.querySelector('div'); // Get the existing div element
        div.textContent = columnSums[i]; // Update the content of the div with the column sum value
        div.title = `Column ${i + 1} sum: ${columnSums[i]}`; // Set the title attribute of the div
    });
    overlayTables.bottomRight.querySelector('div').textContent = 'S←';
}