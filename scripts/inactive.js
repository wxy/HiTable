var link = document.getElementById('HiTableCSS');
if (link) {
  link.remove();
}

document.removeEventListener('mousedown', window.HiTableHandleMouseDown);
document.removeEventListener('mouseover', window.HiTableHandleMouseOver);
document.removeEventListener('mouseup', window.HiTableHandleMouseUp);

// 获取所有具有 'HiTableOverlay' 类名的表格
var overlayTables = document.querySelectorAll('.HiTableOverlay');

// 遍历这些表格，移除 'HiTableOverlay' 类名
overlayTables.forEach(function(table) {
    table.parentNode.removeChild(table);
});

Array.from(document.getElementsByTagName('td')).forEach(td => td.removeAttribute('cell-selected'));