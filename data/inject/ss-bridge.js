(function() {
  const id = 'actitype-ss-port';
  let port = document.getElementById(id);
  if (!port) {
    port = document.createElement('span');
    port.id = id;
    port.style.display = 'none';
    
    // Hide markers from enumeration
    Object.defineProperty(port, 'id', { enumerable: false });
    
    document.documentElement.append(port);
  }

  const sync = () => chrome.storage.local.get({
    ssStealthMode: 'MANUAL',
    webcamStealthMode: 'OFF',
    timerMode: 'OFF'
  }, prefs => {
    port.dataset.mode = prefs.ssStealthMode;
    port.dataset.webcamMode = prefs.webcamStealthMode;
    port.dataset.timerMode = prefs.timerMode;
    port.dispatchEvent(new CustomEvent('actitype-settings-sync'));
  });

  sync();
  chrome.storage.onChanged.addListener(sync);
})();
