# QuickVault - Secure Clipboard & Secret Manager

QuickVault is a premium, privacy-focused Chrome extension designed for developers and power users who need a secure place to store snippets, notes, and sensitive credentials. Built with a modern **Glassmorphism** aesthetic, it combines utility with high-end design.

## 🚀 Core Features

### 📋 Quick Paste (History)
- **Instant Save**: Paste text or images directly into the vault.
- **Auto-Save on Blur**: Automatically saves your input when you click away or switch tasks.
- **Image Support**: Copy/Paste actual image files. QuickVault stores them as high-quality Base64 data and allows you to copy them back as binary files.
- **Smart Limit**: Maintains a clean history of your last 20 important items.
- **Keyboard Optimized**: Use `Enter` to save or `Ctrl+Shift+V` (customizable) to open the vault instantly.

### 🔐 Secure Vault (Encrypted)
- **PIN Protection**: Access your most sensitive data (passwords, API keys) only after entering your private PIN.
- **AES-Inspired Local Encryption**: Data is stored securely on your local hard drive using `chrome.storage.local`.
- **Auto-Lock Session**: The vault automatically locks after 5 minutes of inactivity or when you close the browser.
- **Manual Lock**: One-click locking from the header for instant privacy.

### ⚙️ Settings & Backup
- **Export/Import**: Move your vault data between devices easily using encrypted JSON backups.
- **PIN Management**: Update your security PIN anytime.
- **Danger Zone**: One-click option to wipe all data securely.

## 🎨 Design & UX
- **Glassmorphism UI**: A stunning dark-mode interface with background blurs, radial gradients, and subtle border highlights.
- **Micro-Animations**: Smooth transitions, floating logos, and ripple effects on buttons for a tactile feel.
- **Clean Layout**: A non-boxy, grouped design inspired by modern developer productivity tools.
- **Scrollbar-Free**: A seamless interface with invisible scrollbars that maintain full functionality.

## 🛠️ Technical Implementation
- **Architecture**: Chrome Extension Manifest V3 (MV3).
- **Background Worker**: Handles clipboard clearing timers and system-wide commands.
- **Offscreen Document**: Utilizes a hidden document to manage binary image data and modern Clipboard API requests safely.
- **Storage**: Uses `chrome.storage.local` for persistent data and `chrome.storage.session` for secure session handling.

---

## 👨‍💻 Developer
**Mohamed Aarif**  
*Software Developer | Hope3 services*

Specializing in pixel-perfect Front-end development and robust Back-end solutions. Dedicated to creating premium UI/UX experiences.

- **Portfolio**: [aarif-work.github.io](https://aarif-work.github.io/html/)
- **Company**: [Hope3 services](https://services.hope3.org/home)

---

*QuickVault: Your local vault for a faster, more secure workflow.*
