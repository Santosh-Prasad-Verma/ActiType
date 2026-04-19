window.addEventListener("message", function(e) {
    if (e.source === window && e.data && e.data.target === "extension") {
        try {
            chrome.runtime.sendMessage(e.data.message, response => {
                const err = chrome.runtime.lastError; // Consume error to prevent console noise
                if (err) return;
                
                window.postMessage({
                    source: "extension",
                    response: response
                }, "*");
            });
        } catch (err) {
            // Silently catch extension context invalidation
        }
    }
});