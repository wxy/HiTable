window.onload = function() {
  chrome.storage.sync.get('HiTable', function(data) {
    if (data.HiTable) {
        var boxColorInput = document.querySelector(`input[name="boxColor"][value="${data.HiTable.boxColor}"]`);
        if (boxColorInput) {
            boxColorInput.checked = true;
        }
        document.getElementById('top').value = data.HiTable.algorithm.top;
        document.getElementById('right').value = data.HiTable.algorithm.right;
        document.getElementById('bottom').value = data.HiTable.algorithm.bottom;
        document.getElementById('left').value = data.HiTable.algorithm.left;
        // Set more options here
      }
  });
  var form = document.getElementById('optionsForm');
  var submitButton = form.querySelector('input[type="submit"]');

  function saveOptions(event) {
    event.preventDefault();

    var boxColor = document.querySelector('input[name="boxColor"]:checked').value;
    var top = document.getElementById('top').value;
    var right = document.getElementById('right').value;
    var bottom = document.getElementById('bottom').value;
    var left = document.getElementById('left').value;

    // Get more options here

    var options = { 
        boxColor: boxColor, 
        algorithm: {
            top: top, right: right, bottom: bottom, left: left 
        }
    };
    chrome.storage.sync.set({HiTable: options}, function() {
      console.log(options);
      submitButton.value = 'Saved';
    });
  }

  form.addEventListener('change', saveOptions);
  submitButton.addEventListener('click', saveOptions);
};