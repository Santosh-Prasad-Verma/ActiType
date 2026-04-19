// Declare shared isMac variable
window.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
               navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

// Automatically enable text selection on all websites
(function() {
    function enableTextSelectionGlobally() {
        // Remove CSS rules that disable text selection
        const style = document.createElement('style');
        style.id = 'force-text-selection-style';
        style.innerHTML = `
            * {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                -webkit-touch-callout: default !important;
            }
            .no-select, .noselect, .unselectable,
            .qaas-disable-text-selection,
            .qaas-disable-text-selection *,
            [data-disable-text-selection],
            [data-disable-text-selection] *,
            [unselectable="on"],
            [onselectstart],
            [ondragstart] {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                -webkit-touch-callout: default !important;
            }
        `;
        
        if (!document.getElementById('force-text-selection-style')) {
            document.head.appendChild(style);
        }
        
        const disabledElements = document.querySelectorAll(`
            .no-select, .noselect, .unselectable,
            .qaas-disable-text-selection, 
            [data-disable-text-selection],
            [unselectable="on"],
            [onselectstart],
            [ondragstart]
        `);
        
        disabledElements.forEach(element => {
            element.classList.remove('no-select', 'noselect', 'unselectable', 'qaas-disable-text-selection');
            element.removeAttribute('data-disable-text-selection');
            element.removeAttribute('unselectable');
            element.removeAttribute('onselectstart');
            element.removeAttribute('ondragstart');
            element.style.userSelect = 'text';
        });
        
        document.onselectstart = null;
        document.ondragstart = null;
        document.oncontextmenu = null;
    }
    
    enableTextSelectionGlobally();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enableTextSelectionGlobally);
    }
    
    const observer = new MutationObserver(() => enableTextSelectionGlobally());
    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });
})();

// Shortcuts for Smart Paste and Opacity control
document.addEventListener('keydown', (event) => {
    const isAlt = event.altKey;
    const isShift = event.shiftKey;
    const key = (event.key ?? '').toLowerCase();
    if (!key) return;

    // Alt + Shift + V: Smart Paste
    if (isAlt && isShift && key === 'v') {
        console.log("ActiType: Smart Paste Triggered");
        event.preventDefault();
        event.stopPropagation();
        chrome.runtime.sendMessage({ action: 'triggerSmartPaste' }, () => {
            if (chrome.runtime.lastError) { /* Silent ignore background busy */ }
        });
    }
    
    // Alt + C: Force Copy
    if (isAlt && !isShift && key === 'c') {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
            console.log("ActiType: Force Copy Triggered");
            event.preventDefault();
            event.stopPropagation();
            window.neoPassClipboard = selectedText;
            chrome.runtime.sendMessage({ action: 'forceCopy', text: selectedText }, () => {
                if (chrome.runtime.lastError) { /* Silent ignore background busy */ }
            });
        }
    }

    // Alt + O: Toggle Toast Opacity
    if (isAlt && !isShift && key === 'o') {
        console.log("ActiType: Opacity Toggle Triggered");
        event.preventDefault();
        event.stopPropagation();
        chrome.runtime.sendMessage({ action: 'toggleToastOpacity' }, () => {
            if (chrome.runtime.lastError) { /* Silent ignore background busy */ }
        });
    }
}, true);
