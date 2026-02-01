let clearTimer = null;

// Listen for the keyboard shortcut command
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'copy-last-item') {
        const { lastCopied } = await chrome.storage.local.get('lastCopied');
        if (lastCopied) {
            await writeToClipboard(lastCopied);
            // Optional: Start clear timer for shortcut copies too
            const { clearDelay } = await chrome.storage.local.get('clearDelay');
            if (clearDelay && clearDelay > 0) {
                startClearTimer(clearDelay, lastCopied);
            }
        }
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener(async (message) => {
    if (message.type === 'start-clear-timer') {
        startClearTimer(message.delay, message.value);
    } else if (message.type === 'copy-to-clipboard') {
        writeToClipboard(message.data);
    } else if (message.type === 'copy-done') {
        try {
            await chrome.offscreen.closeDocument();
        } catch (e) {
            console.log("Offscreen document already closed or not found");
        }
    }
});

function startClearTimer(delay, value) {
    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = setTimeout(async () => {
        // Read current clipboard to see if it hasn't changed (best effort)
        // In MV3 SW we can't read clipboard directly, we'll just overwrite with empty
        await writeToClipboard("");
        console.log("Clipboard cleared after delay");
    }, delay);
}

// Helper to write to clipboard using an offscreen document (MV3 requirement)
async function writeToClipboard(text) {
    // Check if offscreen exists
    const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (contexts.length === 0) {
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['CLIPBOARD'],
            justification: 'Clipboard management for QuickVault'
        });
    }

    // Send message to offscreen document
    chrome.runtime.sendMessage({
        type: 'copy-to-clipboard',
        target: 'offscreen',
        data: text
    });
}
