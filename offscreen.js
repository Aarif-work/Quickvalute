chrome.runtime.onMessage.addListener(async (message) => {
    if (message.target === 'offscreen' && message.type === 'copy-to-clipboard') {
        handleCopy(message.data);
    }
});

async function handleCopy(data) {
    try {
        if (typeof data === 'string' && data.startsWith('data:image/')) {
            // Handle Image Copy
            const [header, base64Data] = data.split(',');
            const type = header.split(':')[1].split(';')[0];
            const binary = atob(base64Data);
            const array = [];
            for (let i = 0; i < binary.length; i++) array.push(binary.charCodeAt(i));
            const blob = new Blob([new Uint8Array(array)], { type });

            await navigator.clipboard.write([
                new ClipboardItem({ [type]: blob })
            ]);
        } else {
            // Handle Text Copy
            const textArea = document.createElement('textarea');
            textArea.value = data;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(data);
            }
        }
    } catch (err) {
        console.error('Clipboard copy failed:', err);
    } finally {
        chrome.runtime.sendMessage({ type: 'copy-done' });
    }
}
