chrome.runtime.onMessage.addListener(async (message) => {
    if (message.target === 'offscreen' && message.type === 'copy-to-clipboard') {
        handleCopy(message.data);
    }
});

async function handleCopy(text) {
    try {
        // Basic clipboard write
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        // Also try navigator.clipboard for modern support
        await navigator.clipboard.writeText(text);
    } catch (err) {
        console.error('Clipboard copy failed:', err);
    } finally {
        // Notify background script that we're done with this specific copy
        chrome.runtime.sendMessage({ type: 'copy-done' });
    }
}
