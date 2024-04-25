document.getElementById('HiTableCSS')?.remove();

document.removeEventListener('mousedown', window.HiTableHandleMouseDown);
document.removeEventListener('mouseover', window.HiTableHandleMouseOver);
document.removeEventListener('mouseup', window.HiTableHandleMouseUp);
document.removeEventListener('keydown', window.HiTableHandleKeyDown);

// Remove 'HiTableOverlay' class from all overlay tables
document.querySelectorAll('.HiTableOverlay')
    .forEach(table => table.parentNode.removeChild(table));

// Remove 'cell-selected' attribute from all td elements
Array.from(document.getElementsByTagName('td'))
    .forEach(td => td.removeAttribute('cell-selected'));
