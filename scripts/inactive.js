// ==========================================
// 清理 DOM 元素
// ==========================================
document.getElementById('HiTableCSS')?.remove();
document.getElementById('HiTableStyle')?.remove();

// ==========================================
// 移除事件监听器
// ==========================================
document.removeEventListener('mousedown', window.HiTableHandleMouseDown);
document.removeEventListener('mouseover', window.HiTableHandleMouseOver);
document.removeEventListener('mouseup', window.HiTableHandleMouseUp);
document.removeEventListener('keydown', window.HiTableHandleKeyDown);

// 移除 storage.onChanged 监听器（需要检查扩展上下文是否有效）
try {
    if (window.HiTableState?.storageChangeListener && chrome.runtime?.id) {
        chrome.storage.onChanged.removeListener(window.HiTableState.storageChangeListener);
    }
} catch (e) {
    // 扩展上下文可能已失效，静默处理
}

// ==========================================
// 清理覆盖表格
// ==========================================
// Remove 'HiTableOverlay' class from all overlay tables
document.querySelectorAll('.HiTableOverlay')
    ?.forEach(table => table.parentNode.removeChild(table));

// Remove 'cell-selected' and 'cell-isNaN' attributes from all td elements
document.querySelectorAll('td[cell-selected], td[cell-isNaN], th[cell-selected], th[cell-isNaN]')
    ?.forEach(td => {
        td.removeAttribute('cell-selected');
        td.removeAttribute('cell-isNaN');
    });

// Remove 'cell-highlighted' attribute from all td elements
document.querySelectorAll('td[cell-highlighted], th[cell-highlighted]')
    ?.forEach(td => {
        td.removeAttribute('cell-highlighted');
    });

// ==========================================
// 清理全局状态
// ==========================================
if (window.HiTableState) {
    window.HiTableState.config = {};
    window.HiTableState.startCell = null;
    window.HiTableState.endCell = null;
    window.HiTableState.originalTable = null;
    window.HiTableState.logicTable = null;
    window.HiTableState.currentCell = null;
    window.HiTableState.isMouseDown = false;
    window.HiTableState.selectedCellsData = [];
    window.HiTableState.overlayTable = null;
    window.HiTableState.lastPressCtrlC = 0;
    window.HiTableState.storageChangeListener = null;
}

// 清理事件处理器引用
delete window.HiTableHandleMouseDown;
delete window.HiTableHandleMouseOver;
delete window.HiTableHandleMouseUp;
delete window.HiTableHandleKeyDown;

// 重置初始化标志
window.HiTableInitialized = false;
