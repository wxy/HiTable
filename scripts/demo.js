// Background controls are local to this demo; they never change saved settings.
(function() {
  const controls = document.getElementById('demoBackgroundControls');
  function applyBackground() {
    const shade = document.getElementById('demoDarkBackground').checked ? 'dark' : 'light';
    const selected = controls.querySelector('input[name="demoBackground"]:checked');
    document.documentElement.dataset.demoScheme = shade;
    document.documentElement.style.setProperty('--demo-background', selected.dataset[shade]);
    controls.querySelectorAll('input[name="demoBackground"]').forEach(input => {
      input.nextElementSibling.style.backgroundColor = input.dataset[shade];
    });
  }
  controls.addEventListener('change', applyBackground);
  applyBackground();
})();
