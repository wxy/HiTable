document.getElementById('HiTableCSS')?.remove();

document.removeEventListener('mousedown', window.HiTableHandleMouseDown);
document.removeEventListener('mouseover', window.HiTableHandleMouseOver);
document.removeEventListener('mouseup', window.HiTableHandleMouseUp);
document.removeEventListener('keydown', window.HiTableHandleKeyDown);

// Remove 'HiTableOverlay' class from all overlay tables
document.querySelectorAll('.HiTableOverlay')
    ?.forEach(table => table.parentNode.removeChild(table));

// Remove 'cell-selected' and 'cell-isNaN' attributes from all td elements
document.querySelectorAll('td[cell-selected], td[cell-isNaN], th[cell-selected], th[cell-isNaN]')
    ?.forEach(td => {
        td.removeAttribute('cell-selected');
        td.removeAttribute('cell-isNaN');
    });
