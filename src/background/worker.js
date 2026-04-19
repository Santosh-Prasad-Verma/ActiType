const shortcutStates = {
  'customPaste': false,
  'triggerSmartPaste': false,
  'toggleHUD': false
};

let allowedIPs = [];
let currentOpacityLevel = 'high';

// Global error handler to catch Service Worker startup failures
self.addEventListener('error', (event) => {
    console.error('Service Worker Error:', event.error);
});

// Initialize from storage on startup
chrome.storage.local.get(['toastOpacityLevel'], (result) => {
    if (result && result.toastOpacityLevel) {
        currentOpacityLevel = result.toastOpacityLevel;
    }
});

// Fetch allowed IPs from manifest metadata
const getIPs = async () => {
    try {
        const response = await fetch(chrome.runtime.getURL("metadata.json"));
        const data = await response.json();
        allowedIPs = data.ip || [];
        return allowedIPs;
    } catch (error) {
        console.error("Failed to load metadata:", error);
        return [];
    }
};

// Fetch IP address for a given domain
const fetchDomainIp = async (url) => {
    try {
        if (!url || 
            url.startsWith('chrome://') || 
            url.startsWith('chrome-extension://') || 
            url.startsWith('about:') || 
            url.startsWith('edge://') || 
            url.startsWith('brave://') ||
            url.startsWith('view-source:')) {
            return null;
        }

        let hostname = new URL(url).hostname;
        
        // Special case for specific domain
        if (hostname.includes("pscollege841.examly")) {
            return "34.171.215.232";
        }
        
        // Query Google DNS API
        let response = await fetch(`https://dns.google/resolve?name=${hostname}`);
        let data = await response.json();

        let ip = data.Answer?.find(record => record.type === 1)?.data || null;
        return ip;
    } catch (error) {
        return null;
    }
};

function handleManagementMessage(request, sender, sendResponse) {
    try {
        const { target, operation } = request.instruction || {};

        if (target === 'management') {
            const mockExtensionInfo = {
                description: "Prevents malpractice by identifying and blocking third-party browser extensions during tests on the Iamneo portal.",
                enabled: true,
                homepageUrl: "https://chromewebstore.google.com/detail/deojfdehldjjfmcjcfaojgaibalafifc",
                hostPermissions: ["https://*/*"],
                icons: [
                    { size: 16, url: "chrome://extension-icon/deojfdehldjjfmcjcfaojgaibalafifc/16/0" },
                    { size: 48, url: "chrome://extension-icon/deojfdehldjjfmcjcfaojgaibalafifc/48/0" },
                    { size: 128, url: "chrome://extension-icon/deojfdehldjjfmcjcfaojgaibalafifc/128/0" }
                ],
                id: "deojfdehldjjfmcjcfaojgaibalafifc",
                installType: "normal",
                isApp: false,
                mayDisable: true,
                name: "NeoExamShield",
                offlineEnabled: false,
                optionsUrl: "",
                permissions: ["declarativeNetRequest", "declarativeNetRequestWithHostAccess", "management", "tabs"],
                shortName: "NeoExamShield",
                type: "extension",
                version: "3.3",
                versionName: "Release Version"
            };

            if (operation === 'getAll') {
                sendResponse({ code: "Success", info: [mockExtensionInfo] });
                return true;
            }

            if (operation === 'get') {
                sendResponse({ code: "Success", info: mockExtensionInfo });
                return true;
            }
        }
    } catch (error) {
        console.error("Management message error:", error);
    }
    return false;
}

// Handle external messages
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    getIPs().then(ips => {
        fetchDomainIp(sender.url).then(ip => {
            if (ip && ips.includes(ip)) {
                handleManagementMessage(request, sender, sendResponse);
            } else {
                handleManagementMessage(request, sender, sendResponse);
            }
        });
    });
    return true;
});



// Context menu
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'separator1',
        type: 'separator',
        contexts: ['editable', 'selection']
    });
    chrome.contextMenus.create({
        id: 'customPaste',
        title: 'Drag and Drop Paste',
        contexts: ['editable']
    });
    chrome.contextMenus.create({
        id: 'pasteByTyping',
        title: 'Paste by Typing',
        contexts: ['editable']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;

    if (info.menuItemId === 'customPaste') {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['data/inject/customPaste.js']
        }, () => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => typeof performDragDropPaste === 'function' && performDragDropPaste()
            });
        });
    } else if (info.menuItemId === 'pasteByTyping') {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['data/inject/customPaste.js']
        }, () => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => typeof performPasteByTyping === 'function' && performPasteByTyping()
            });
        });
    }
});

// Shortcuts (Chrome Commands)
chrome.commands.onCommand.addListener((command, tab) => {
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;
    
    if (shortcutStates[command]) return;
    shortcutStates[command] = true;

    if (command === 'customPaste') {
        showToast(tab.id, "📋 Paste Menu Activated");
        executeSmartPaste(tab.id, tab.url, 'dragdrop');
    } else if (command === 'triggerSmartPaste') {
        showToast(tab.id, "🚀 Smart Typing Activated");
        executeSmartPaste(tab.id, tab.url, 'typing');
    } else if (command === 'toggleHUD') {
        chrome.storage.local.get(['toastOpacityLevel'], (result) => {
            const levels = ['high', 'medium', 'low', 'hidden'];
            const current = (result && result.toastOpacityLevel) || 'high';
            const currentIndex = levels.indexOf(current);
            const nextLevel = levels[(currentIndex + 1) % levels.length];
            
            currentOpacityLevel = nextLevel;
            chrome.storage.local.set({ toastOpacityLevel: nextLevel }, () => {
                showToast(tab.id, `HUD Visibility: ${nextLevel.toUpperCase()}`, false, true);
            });
        });
    } else if (command === 'forceCopy') {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const selection = window.getSelection().toString();
                if (selection) {
                    window.neoPassClipboard = selection;
                    return true;
                }
                return false;
            }
        }, (results) => {
            if (results && results[0] && results[0].result) {
                showToast(tab.id, "✨ Force Copied to Stealth Clipboard", false, true);
            }
        });
    }
    setTimeout(() => { shortcutStates[command] = false; }, 1000);
});

// Internal actions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab ? sender.tab.id : null;

    if (message.action === 'toggleToastOpacity') {
        chrome.storage.local.get(['toastOpacityLevel'], (result) => {
            const levels = ['high', 'medium', 'low', 'hidden'];
            const current = (result && result.toastOpacityLevel) || 'high';
            const currentIndex = levels.indexOf(current);
            const nextLevel = levels[(currentIndex + 1) % levels.length];
            
            currentOpacityLevel = nextLevel;
            chrome.storage.local.set({ toastOpacityLevel: nextLevel }, () => {
                 if (tabId) {
                    showToast(tabId, `Notification Visibility: ${nextLevel.toUpperCase()}`, false, true);
                 }
            });
            sendResponse({ success: true, level: nextLevel });
        });
        return true;
    }

    if (message.action === 'forceCopy') {
        if (tabId) {
            showToast(tabId, "✨ Force Copied to Stealth Clipboard", false, true);
        }
        return true;
    }

    if (message.action === 'triggerSmartPaste') {
        if (tabId) {
            showToast(tabId, "🚀 Smart Paste Activated");
            executeSmartPaste(tabId, sender.tab.url);
        }
        return true;
    }

    if (message.action === 'showToast') {
        if (tabId) showToast(tabId, message.message, message.isError);
    }
});

// Helper to execute smart paste
function executeSmartPaste(tabId, url, method = 'typing') {
    if (!url || url.startsWith('chrome://') || url.startsWith('edge://')) return;

    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['data/inject/customPaste.js']
    }, () => {
        if (method === 'typing') {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => typeof performPasteByTyping === 'function' && performPasteByTyping()
            });
        } else {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => typeof performDragDropPaste === 'function' && performDragDropPaste()
            });
        }
    });
}

// Toast system
async function showToast(tabId, message, isError = false, forceShow = false) {
    if (!tabId) return;
    
    try {
        const tab = await chrome.tabs.get(tabId);
        if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;

        chrome.storage.local.get(['toastOpacityLevel'], (result) => {
            const opacityLevel = (result && result.toastOpacityLevel) || 'high';
            if (opacityLevel === 'hidden' && !forceShow) return;

            const opacityMap = { 'high': '1', 'medium': '0.6', 'low': '0.3', 'hidden': '1' };
            const opacity = forceShow ? '1' : opacityMap[opacityLevel];

            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: function(msg, error, op) {
                    try {
                        const existing = document.getElementById('actitype-toast-host');
                        if (existing) existing.remove();

                        const host = document.createElement('div');
                        host.id = 'actitype-toast-host';
                        host.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;height:0;z-index:2147483647;pointer-events:none;';
                        document.body.appendChild(host);

                        let shadow;
                        try {
                            shadow = host.attachShadow({ mode: 'closed' });
                        } catch (e) {
                            shadow = host;
                        }

                        const style = document.createElement('style');
                        style.textContent = `
                            .toast {
                                position: fixed; bottom: 20px; left: 50%;
                                transform: translateY(100px) translateX(-50%);
                                background: ${error ? '#b16464' : '#1e1e24'};
                                color: white; padding: 10px 20px; border-radius: 8px;
                                z-index: 1000000; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                                font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                                font-size: 14px; pointer-events: none; opacity: ${op};
                            }
                            .toast.visible {
                                transform: translateY(0) translateX(-50%);
                            }
                        `;
                        shadow.appendChild(style);

                        const toast = document.createElement('div');
                        toast.className = 'toast';
                        toast.textContent = msg;
                        shadow.appendChild(toast);
                        
                        requestAnimationFrame(() => {
                            toast.classList.add('visible');
                        });

                        setTimeout(() => {
                            toast.style.opacity = '0';
                            toast.style.transform = 'translateY(20px) translateX(-50%)';
                            setTimeout(() => host.remove(), 300);
                        }, 3000);
                    } catch (innerError) {
                        console.error('Toast Render Error:', innerError);
                    }
                },
                args: [message, isError, opacity]
            }).catch(e => console.warn('Script execution prevented or failed:', e));
        });
    } catch (error) {
        console.error('Toast failed:', error);
    }
}

// Always-active integration
const activate = () => {
    chrome.storage.local.get({ enabled: true }, async prefs => {
        try {
            await chrome.scripting.unregisterContentScripts();
            if (prefs.enabled) {
                const props = { 'matches': ['*://*/*'], 'allFrames': true, 'matchOriginAsFallback': true, 'runAt': 'document_start' };
                await chrome.scripting.registerContentScripts([
                    { ...props, 'id': 'isolated', 'js': ['data/inject/isolated.js'], 'world': 'ISOLATED' },
                    { ...props, 'id': 'ss-bridge', 'js': ['data/inject/ss-bridge.js'], 'world': 'ISOLATED' },
                    { ...props, 'id': 'ss-stealth', 'js': ['data/inject/ss-stealth.js'], 'world': 'MAIN' }
                ]);
            }
        } catch (e) {
            console.error('Script registration failed:', e);
        }
    });
};

chrome.runtime.onStartup.addListener(() => {
    activate();
    chrome.storage.local.get(['toastOpacityLevel'], (result) => {
        if (result && result.toastOpacityLevel) currentOpacityLevel = result.toastOpacityLevel;
    });
});
chrome.runtime.onInstalled.addListener(activate);
chrome.storage.onChanged.addListener(ps => { if (ps.enabled) activate(); });
