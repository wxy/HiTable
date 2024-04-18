window.onload = function() {
  chrome.storage.sync.get('HiTable', function(data) {
    if (data.HiTable) {
        document.querySelector(`input[name="rowColor"][value="${data.HiTable.rowColor}"]`).checked = true;
        document.getElementById('topLeft').value = data.HiTable.topLeft;
        document.getElementById('bottomRight').value = data.HiTable.bottomRight;
        document.getElementById('topRight').value = data.HiTable.topRight;
        document.getElementById('bottomLeft').value = data.HiTable.bottomLeft;
        // Set more options here
      }
  });
  document.getElementById('optionsForm').addEventListener('submit', function(event) {
    event.preventDefault();
  
    var rowColor = document.querySelector('input[name="rowColor"]:checked').value;
    var topLeft = document.getElementById('topLeft').value;
    var bottomRight = document.getElementById('bottomRight').value;
    var topRight = document.getElementById('topRight').value;
    var bottomLeft = document.getElementById('bottomLeft').value;

    // Get more options here
  
    var options = { rowColor: rowColor, topLeft: topLeft, bottomRight: bottomRight, topRight: topRight, bottomLeft: bottomLeft };
    chrome.storage.sync.set({HiTable: options}, function() {
      console.log('Options saved');
    });
  });
};