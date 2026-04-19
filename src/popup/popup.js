document.addEventListener('DOMContentLoaded', function () {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
                  navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

    // Elements
    const statusMessage = document.getElementById('statusMessage');
    const toastOpacityBtn = document.getElementById('toastOpacityBtn');
    const ssStealthBtn = document.getElementById('ssStealthBtn');
    const webcamStealthBtn = document.getElementById('webcamStealthBtn');
    const timerControlBtn = document.getElementById('timerControlBtn');
    
    const opacityLevelDisplay = document.getElementById('opacityLevel');
    const ssModeDisplay = document.getElementById('ssModeDisplay');
    const ssModeDesc = document.getElementById('ssModeDesc');
    const webcamModeDisplay = document.getElementById('webcamModeDisplay');
    const webcamModeDesc = document.getElementById('webcamModeDesc');
    const timerModeDisplay = document.getElementById('timerModeDisplay');
    const timerModeDesc = document.getElementById('timerModeDesc');
    
    const uninstallBtn = document.getElementById('uninstallBtn');
    const navUnderline = document.querySelector('.nav-underline');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const viewPanels = document.querySelectorAll('.view-panel');

    // --- Tab Navigation ---
    function updateNavUnderline(activeTab) {
        if (!navUnderline) return;
        const width = activeTab.offsetWidth;
        const left = activeTab.offsetLeft;
        navUnderline.style.width = `${width}px`;
        navUnderline.style.left = `${left}px`;
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            viewPanels.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) targetPanel.classList.add('active');
            
            updateNavUnderline(btn);
        });
    });

    // Initialize underline
    setTimeout(() => {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) updateNavUnderline(activeTab);
    }, 50);

    // --- Helper Functions ---
    function showMessage(message, type = 'success') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message glass ${type}`;
        statusMessage.classList.remove('hidden');
        
        setTimeout(() => {
            statusMessage.classList.add('hidden');
        }, 2500);
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    // --- Shortcuts Localization ---
    function localizeShortcuts() {
        document.querySelectorAll('.os-shortcut').forEach(el => {
            const rawKey = el.getAttribute('data-key');
            if (!rawKey) return;
            
            let localized = rawKey;
            if (isMac) {
                localized = rawKey.replace('Alt', 'Option').replace('Ctrl', 'Control');
            } else {
                localized = rawKey.replace('Option', 'Alt').replace('Control', 'Ctrl');
            }
            el.textContent = localized;
        });
    }

    // --- State Management ---
    const ssModeNames = { 'OFF': 'Disabled', 'MANUAL': 'Manual', 'BLOCK': 'Block All', 'AUTO_BLANK': 'Blank Feed' };
    const ssModeDescs = {
        'OFF': 'Standard behavior.',
        'MANUAL': 'Prompt for setiap request.',
        'BLOCK': 'Auto-reject sharing.',
        'AUTO_BLANK': 'Feeds a black screen.'
    };

    const webcamModeNames = { 'OFF': 'Disabled', 'BLOCK': 'Block All', 'STATIC': 'Dark Room', 'FREEZE': 'Freeze' };
    const webcamModeDescs = {
        'OFF': 'Standard behavior.',
        'BLOCK': 'Prevent webcam access.',
        'STATIC': 'Virtual dark-room feed.',
        'FREEZE': 'Loop last frame.'
    };

    const timerModeNames = { 'OFF': 'Disabled', 'SLOW': '3× Slower', 'PAUSE': 'Paused' };
    const timerModeDescs = {
        'OFF': 'Normal clock speed.',
        'SLOW': 'Timers run significantly slower.',
        'PAUSE': 'New timers are frozen.'
    };

    function updateUI() {
        chrome.storage.local.get({
            toastOpacityLevel: 'high',
            ssStealthMode: 'MANUAL',
            webcamStealthMode: 'OFF',
            timerMode: 'OFF'
        }, (prefs) => {
            // Opacity
            if (opacityLevelDisplay) opacityLevelDisplay.textContent = capitalize(prefs.toastOpacityLevel);
            
            // Screen Share
            if (ssModeDisplay) {
                ssModeDisplay.textContent = ssModeNames[prefs.ssStealthMode] || prefs.ssStealthMode;
                ssModeDisplay.className = `mode-badge ${prefs.ssStealthMode === 'OFF' ? '' : 'active'}`;
            }
            if (ssModeDesc) ssModeDesc.textContent = ssModeDescs[prefs.ssStealthMode] || '';

            // Webcam
            if (webcamModeDisplay) {
                webcamModeDisplay.textContent = webcamModeNames[prefs.webcamStealthMode] || prefs.webcamStealthMode;
                webcamModeDisplay.className = `mode-badge cyan ${prefs.webcamStealthMode === 'OFF' ? '' : 'active'}`;
            }
            if (webcamModeDesc) webcamModeDesc.textContent = webcamModeDescs[prefs.webcamStealthMode] || '';

            // Timer
            if (timerModeDisplay) {
                timerModeDisplay.textContent = timerModeNames[prefs.timerMode] || prefs.timerMode;
                timerModeDisplay.className = `mode-badge warning ${prefs.timerMode === 'OFF' ? '' : 'active'}`;
            }
            if (timerModeDesc) timerModeDesc.textContent = timerModeDescs[prefs.timerMode] || '';
        });
    }

    // --- Initial Sync ---
    updateUI();
    localizeShortcuts();

    // --- Interaction Listeners ---
    if (toastOpacityBtn) {
        toastOpacityBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'toggleToastOpacity' }, (response) => {
                if (response?.success) {
                    opacityLevelDisplay.textContent = capitalize(response.level);
                    showMessage(`HUD Visibility: ${capitalize(response.level)}`);
                }
            });
        });
    }

    const ssModes = ['OFF', 'MANUAL', 'BLOCK', 'AUTO_BLANK'];
    if (ssStealthBtn) {
        ssStealthBtn.addEventListener('click', () => {
            chrome.storage.local.get({ ssStealthMode: 'MANUAL' }, (prefs) => {
                const next = ssModes[(ssModes.indexOf(prefs.ssStealthMode) + 1) % ssModes.length];
                chrome.storage.local.set({ ssStealthMode: next }, () => {
                    updateUI();
                    showMessage(`Screen: ${ssModeNames[next]}`);
                });
            });
        });
    }

    const webcamModes = ['OFF', 'BLOCK', 'STATIC', 'FREEZE'];
    if (webcamStealthBtn) {
        webcamStealthBtn.addEventListener('click', () => {
            chrome.storage.local.get({ webcamStealthMode: 'OFF' }, (prefs) => {
                const next = webcamModes[(webcamModes.indexOf(prefs.webcamStealthMode) + 1) % webcamModes.length];
                chrome.storage.local.set({ webcamStealthMode: next }, () => {
                    updateUI();
                    showMessage(`Webcam: ${webcamModeNames[next]}`);
                });
            });
        });
    }

    const timerModes = ['OFF', 'SLOW', 'PAUSE'];
    if (timerControlBtn) {
        timerControlBtn.addEventListener('click', () => {
            chrome.storage.local.get({ timerMode: 'OFF' }, (prefs) => {
                const next = timerModes[(timerModes.indexOf(prefs.timerMode) + 1) % timerModes.length];
                chrome.storage.local.set({ timerMode: next }, () => {
                    updateUI();
                    showMessage(`Clock: ${timerModeNames[next]}`);
                });
            });
        });
    }

    if (uninstallBtn) {
        uninstallBtn.addEventListener('click', async () => {
            if(confirm("Complete System Purge (Uninstall ActiType)?")) {
                await chrome.storage.local.clear();
                chrome.management.uninstallSelf();
            }
        });
    }

    // Listen for storage changes (shortcuts etc)
    chrome.storage.onChanged.addListener(() => updateUI());
});
