<div align="center">

# 🚀 ActiType Extension

**A powerful, customizable, plug-and-play browser extension for students.**  
*Break free from portal restrictions with the AI provider of your choice.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue.svg)](chrome://extensions/)
[![Status: Active](https://img.shields.io/badge/Status-Active-success.svg)](#)

</div>

---

> [!IMPORTANT]
> **💡 Bring Your Own API**: ActiType is fully open and runs locally. Configure your own AI API key by clicking the extension icon and going to the **Settings** tab.  
> Supported providers: **OpenAI**, **Google Gemini**, **Anthropic (Claude)**, **DeepSeek**, and **Custom Endpoints**.

> [!WARNING]
> **🎓 Educational Purposes Only**: This extension is intended for educational purposes and productivity. Please use it responsibly and ethically. We are not responsible for actions taken, and we do not encourage or promote cheating. Maintain your academic integrity.

---

## ✨ Features

*   🌍 **Bring Your Own API**: Use the AI you prefer without paying for a subscription. Seamlessly plug in an API Key from your favorite LLM provider.
*   🧠 **NPTEL Integration**: Instantly solve NPTEL MCQs.
*   🛡️ **ExamShield Bypass**: Break free from strict limitations where the extension mimics standard behavior.
*   💬 **AI Chatbot Overlay**: Leverage a stealthy AI Chatbot to get fast contextual answers.
*   🎯 **Smart Select & Solve**: Select text and trigger searches or MCQ solvers immediately using AI.
*   🔄 **Tab Switching Bypass**: Prevents unwanted tab switch restrictions from interrupting your test.
*   📋 **Smart Pasting**: Quickly paste answers using drag-and-drop mechanics or bypass utilities when manual pasting is restricted.

---

## ⬇️ Installation

1. Clone or download this repository to your local machine.
2. Open Chrome and navigate to the Extensions page by typing `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click on **Load unpacked** and select the `ActiType` root folder.
5. Pin the ActiType extension to your toolbar for easy access!

---

## 💻 Usage

1. Click the ActiType extension icon in your browser toolbar.
2. Go to the **Settings** tab.
3. Select your AI provider from the dropdown.
4. If using a Custom Provider, enter your specific API Endpoint URL.
5. Enter your AI API key.
6. *(Optional)* Provide a specific Model name if required.
7. Click **"Test Connection"** to verify your setup.
8. Once successful, you can begin using ActiType's shortcuts!

---

## ⌨️ Shortcuts

| Action | Shortcut (Win / Linux) | Shortcut (macOS) | Requirements |
| :--- | :--- | :--- | :--- |
| **Search Answers Using AI** | <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | <kbd>Option</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | *Must Select Text First* |
| **Solve MCQs Using AI** | <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd> | <kbd>Option</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd> | *Must Select Text First* |
| **Solve NPTEL MCQs** | <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd> | <kbd>Option</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd> | *Must Select Text First* |
| **Search IamNeo Answers** | <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> | <kbd>Option</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> | None |
| **Type IamNeo Coding** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> | <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> | None |
| **Solve HackerRank [BETA]**| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>H</kbd> | <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>H</kbd> | None |
| **Toggle Chatbot Overlay** | <kbd>Alt</kbd> + <kbd>C</kbd> | <kbd>Option</kbd> + <kbd>C</kbd> | None |
| **Paste (Drag & Drop bypass)**| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd> | <kbd>Option</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd> | None |

> *Note: Global opacity for toast notifications can be quickly toggled using <kbd>Alt</kbd>/<kbd>Option</kbd> + <kbd>O</kbd>.*

---

## 🤝 Contribute or Add NPTEL Dataset

If you want to contribute to the NPTEL question database, follow these steps:

1. Fork this repository.
2. Open your NPTEL assignment page in the browser.
3. Open browser developer tools (<kbd>F12</kbd> or right-click > Inspect).
4. Go to the **Console** tab and paste the script from `nptel.txt` located in the repository.
5. The script will extract all questions and correct answers from the page.
6. Copy the output JSON data.
7. Update the `data/nptel.json` file with the new additions.
8. Create a pull request to contribute back to the main repository!

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
