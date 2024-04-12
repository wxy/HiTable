const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = chrome.runtime.getURL('../src/assets/main.css');
(document.head || document.documentElement).appendChild(link);

let startCell = null;
let endCell = null;
let isMouseDown = false;
let selectedCellsData = [];

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
    isMouseDown = true;
    startCell = event.target;
    endCell = event.target;
    startCell.setAttribute('cell-selected', 'true');
  }
});

// Mouse up event
document.addEventListener('mouseup', (event) => {
  if (isMouseDown && event.target.tagName.toLowerCase() === 'td') {
    isMouseDown = false;
    console.log(startCell, endCell);
    selectCellsAndFillArray(startCell, endCell);
  }
});

// Mouse over event to highlight cell during mouse down and moving over
document.addEventListener('mouseover', (event) => {
  if (isMouseDown && event.target.tagName.toLowerCase() === 'td') {
    endCell = event.target;
    //console.log(isMouseDown, endCell);
    endCell.setAttribute('cell-selected', 'true');
  }
});

function selectCellsAndFillArray(start, end) {
  let cells = getCellsInRectangle(start, end);
  let cellValues = cells.map(cell => cell.innerText);
  selectedCellsData = [];
  while (cellValues.length) selectedCellsData.push(cellValues.splice(0, end.cellIndex - start.cellIndex + 1)); 
  console.log(selectedCellsData);
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
    console.log(top, bottom, left, right);
    const selectedCells = [];
  
    let parentTable = start.parentElement.parentElement; // 获取单元格的父级表格
  
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        console.log(parentTable.rows[r].cells[c]);
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