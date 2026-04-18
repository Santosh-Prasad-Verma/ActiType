document.addEventListener('DOMContentLoaded', function () {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
                  navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

    const statusMessage = document.getElementById('statusMessage');
    const toastOpacityBtn = document.getElementById('toastOpacityBtn');
    const opacityLevelDisplay = document.getElementById('opacityLevel');
    const opacityShortcutDisplay = document.getElementById('opacityShortcutDisplay');
    const uninstallBtn = document.getElementById('uninstallBtn');
    
    // API Configuration elements
    const aiProviderSelect = document.getElementById('aiProvider');
    const customEndpointGroup = document.getElementById('customEndpointGroup');
    const customEndpointInput = document.getElementById('customEndpoint');
    const apiKeyInput = document.getElementById('apiKey');
    const modelNameInput = document.getElementById('modelName');
    const testConnectionBtn = document.getElementById('testConnectionBtn');

    // Debounced auto-save function for API configuration
    let saveTimeout;
    function autoSaveAPIConfig() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            const apiKey = apiKeyInput?.value?.trim();
            const aiProvider = aiProviderSelect?.value;
            const customEndpoint = customEndpointInput?.value?.trim();
            const modelName = modelNameInput?.value?.trim();
            
            if (apiKey) {
                try {
                    await chrome.storage.local.set({
                        useCustomAPI: true,
                        aiProvider: aiProvider,
                        customEndpoint: customEndpoint,
                        customAPIKey: apiKey,
                        customModelName: modelName
                    });
                    console.log('API configuration auto-saved');
                    showMessage('Saved successfully', 'success', 1500);
                } catch (error) {
                    console.error('Error auto-saving API configuration:', error);
                    showMessage('Failed to save', 'error', 2000);
                }
            }
        }, 1000);
    }

    // Function to clear chat history when provider changes
    function clearChatHistoryOnProviderChange() {
        try {
            chrome.tabs.query({}, function(tabs) {
                tabs.forEach(tab => {
                    try {
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'clearChatHistory',
                            reason: 'providerChange'
                        }).catch(() => {});
                    } catch (error) {}
                });
            });
        } catch (error) {
            console.error('Error clearing chat history:', error);
        }
    }

    // Tab Navigation
    const tabBtns = document.querySelectorAll('.tab-btn');
    const viewPanels = document.querySelectorAll('.view-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            viewPanels.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Helper Functions
    function showMessage(message, type = 'success', duration = 3000) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.classList.remove('hidden');
        
        setTimeout(() => {
            statusMessage.classList.add('hidden');
        }, duration);
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function updateShortcutsForPlatform() {
        // Adjust display for Mac vs PC
        if (opacityShortcutDisplay) {
            opacityShortcutDisplay.textContent = isMac ? 'Option + O' : 'Alt + O';
        }

        document.querySelectorAll('.os-shortcut').forEach(el => {
            const rawKey = el.getAttribute('data-key');
            if (!rawKey) return;
            
            if (isMac) {
                let macKey = rawKey.replace('Alt', 'Option')
                                   .replace('Control', 'Control') // Mac often retains physical Ctrl for some things, but usually it translates. ActiType previous mappings kept 'Control' for Mac.
                                   .replace('Ctrl', 'Control');
                el.textContent = macKey;
            } else {
                let winKey = rawKey.replace('Option', 'Alt')
                                   .replace('Control', 'Ctrl');
                el.textContent = winKey;
            }
        });
    }

    // Initialize Opacity Level
    function initializeOpacityLevel() {
        chrome.storage.local.get(['toastOpacityLevel'], (result) => {
            if (result.toastOpacityLevel) {
                opacityLevelDisplay.textContent = capitalizeFirstLetter(result.toastOpacityLevel);
            } else {
                opacityLevelDisplay.textContent = 'High';
            }
        });
    }

    // Load saved API configuration
    function loadAPIConfiguration() {
        chrome.storage.local.get([
            'aiProvider',
            'customEndpoint',
            'customAPIKey',
            'customModelName'
        ], (result) => {
            if (result.aiProvider && aiProviderSelect) {
                aiProviderSelect.value = result.aiProvider;
                if (result.aiProvider === 'custom') {
                    customEndpointGroup.classList.remove('hidden');
                } else {
                    customEndpointGroup.classList.add('hidden');
                }
            } else {
                if(customEndpointGroup) customEndpointGroup.classList.add('hidden');
            }
            if (result.customEndpoint && customEndpointInput) {
                customEndpointInput.value = result.customEndpoint;
            }
            if (result.customAPIKey && apiKeyInput) {
                apiKeyInput.value = result.customAPIKey;
            }
            if (result.customModelName && modelNameInput) {
                modelNameInput.value = result.customModelName;
            }
        });
    }

    // Init
    loadAPIConfiguration();
    initializeOpacityLevel();
    updateShortcutsForPlatform();

    window.addEventListener('offline', () => {
        showMessage('No internet connection', 'error');
    });

    // Event Listeners
    if (toastOpacityBtn) {
        toastOpacityBtn.addEventListener('click', function() {
            chrome.runtime.sendMessage({ action: 'toggleToastOpacity' }, (response) => {
                if (response && response.success) {
                    opacityLevelDisplay.textContent = capitalizeFirstLetter(response.level);
                    showMessage(`Toast opacity: ${capitalizeFirstLetter(response.level)}`, 'success', 2000);
                }
            });
        });
    }

    if (aiProviderSelect) {
        aiProviderSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customEndpointGroup.classList.remove('hidden');
            } else {
                customEndpointGroup.classList.add('hidden');
            }
            clearChatHistoryOnProviderChange();
            autoSaveAPIConfig();
        });
    }

    if (apiKeyInput) apiKeyInput.addEventListener('input', autoSaveAPIConfig);
    if (customEndpointInput) customEndpointInput.addEventListener('input', autoSaveAPIConfig);
    if (modelNameInput) modelNameInput.addEventListener('input', autoSaveAPIConfig);

    if (testConnectionBtn) {
        testConnectionBtn.addEventListener('click', async function() {
            const apiKey = apiKeyInput.value.trim();
            const aiProvider = aiProviderSelect.value;
            const customEndpoint = customEndpointInput.value.trim();
            const modelName = modelNameInput.value.trim();

            if (!apiKey) {
                showMessage('Please enter an API key first', 'error', 3000);
                return;
            }

            testConnectionBtn.textContent = 'Testing...';
            testConnectionBtn.disabled = true;

            try {
                chrome.runtime.sendMessage({
                    action: 'testCustomAPI',
                    config: {
                        aiProvider: aiProvider,
                        customEndpoint: customEndpoint,
                        apiKey: apiKey,
                        modelName: modelName
                    }
                }, (response) => {
                    testConnectionBtn.textContent = 'Test Connection';
                    testConnectionBtn.disabled = false;

                    if (response && response.success) {
                        showMessage('Connection successful', 'success', 3000);
                    } else {
                        showMessage('Connection failed: ' + (response?.error || 'Unknown error'), 'error', 4000);
                    }
                });
            } catch (error) {
                testConnectionBtn.textContent = 'Test Connection';
                testConnectionBtn.disabled = false;
                showMessage('Error testing API: ' + error.message, 'error', 4000);
            }
        });
    }

    if (uninstallBtn) {
        uninstallBtn.addEventListener('click', async () => {
            try {
                if(confirm("Are you sure you want to uninstall ActiType?")) {
                    await chrome.storage.local.clear();
                    chrome.management.uninstallSelf();
                }
            } catch (error) {
                console.error('Error during uninstall:', error);
                showMessage('Error uninstalling extension', 'error');
            }
        });
    }
});
