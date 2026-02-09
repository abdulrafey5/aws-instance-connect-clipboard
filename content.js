console.log("AWS Clipboard extension loaded in frame:", window.location.href);

// Wait for terminal to be ready
let terminalReady = false;
let xtermInstance = null;

// Try to find the xterm instance
const findXtermInstance = () => {
  const checkInterval = setInterval(() => {
    const terminal = document.querySelector('.xterm-helper-textarea');
    if (terminal) {
      console.log("Terminal textarea found");
      clearInterval(checkInterval);
      
      // Try to access xterm instance from the DOM
      const xtermScreen = document.querySelector('.xterm-screen');
      if (xtermScreen && xtermScreen.parentElement) {
        // Look for xterm instance in the element's properties
        for (let key in xtermScreen.parentElement) {
          if (key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber')) {
            console.log("Found React instance");
          }
        }
      }
    }
  }, 500);
};

findXtermInstance();

document.addEventListener("keydown", async (e) => {
  // Only handle Ctrl+Shift+C and Ctrl+Shift+V
  if (!e.ctrlKey || !e.shiftKey) return;
  
  const key = e.key.toUpperCase();
  
  if (key === "C") {
    // COPY - Prevent DevTools from opening
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    console.log("COPY triggered");
    
    // Method 1: Try to get selected text from xterm screen
    let text = "";
    
    // Check if there's a selection rendered on the screen
    const selection = document.querySelector('.xterm-selection');
    if (selection) {
      console.log("Selection div found");
    }
    
    // Method 2: Get all text spans that have selection class
    const selectedSpans = document.querySelectorAll('.xterm-rows [style*="background"]');
    if (selectedSpans.length > 0) {
      text = Array.from(selectedSpans).map(span => span.textContent).join('');
      console.log("Text from selected spans:", text);
    }
    
    // Method 3: Use window.getSelection as fallback
    if (!text) {
      text = window.getSelection()?.toString() || "";
      console.log("Text from window selection:", text);
    }
    
    // Method 4: Try execCommand
    if (!text) {
      const tempTextarea = document.createElement('textarea');
      tempTextarea.style.position = 'fixed';
      tempTextarea.style.opacity = '0';
      document.body.appendChild(tempTextarea);
      tempTextarea.focus();
      
      if (document.execCommand('copy')) {
        console.log("Used execCommand copy");
      }
      
      document.body.removeChild(tempTextarea);
      
      // Read what was copied
      try {
        text = await navigator.clipboard.readText();
        console.log("Text from clipboard after execCommand:", text);
      } catch (err) {
        console.log("Could not read clipboard");
      }
    }
    
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        console.log("✓ Copied to clipboard:", text);
        showToast("Copied ✓", false);
      } catch (err) {
        console.error("✗ Copy failed:", err);
        showToast("Copy failed ✗", true);
      }
    } else {
      console.log("No text found to copy");
      showToast("No text selected", true);
    }
    
    return false;
  }
  
  if (key === "V") {
    // PASTE
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    try {
      const text = await navigator.clipboard.readText();
      console.log("PASTE - Clipboard text:", text);
      
      if (!text) {
        console.log("Clipboard is empty");
        return false;
      }
      
      // Find terminal input
      let terminal = document.querySelector('.xterm-helper-textarea') || 
                     document.querySelector('textarea') ||
                     document.querySelector('input');
      
      console.log("Target element:", terminal, "Tag:", terminal?.tagName);
      
      if (!terminal) {
        console.error("No terminal input found");
        showToast("No input found ✗", true);
        return false;
      }
      
      // Focus it first
      terminal.focus();
      console.log("Focused terminal");
      
      // Method 1: Set value directly
      if (terminal.tagName === 'TEXTAREA' || terminal.tagName === 'INPUT') {
        const start = terminal.selectionStart || 0;
        const end = terminal.selectionEnd || 0;
        const before = terminal.value.substring(0, start);
        const after = terminal.value.substring(end);
        terminal.value = before + text + after;
        terminal.selectionStart = terminal.selectionEnd = start + text.length;
        console.log("Set value directly");
      }
      
      // Method 2: Dispatch input event
      const inputEvent = new InputEvent('input', {
        data: text,
        inputType: 'insertText',
        bubbles: true,
        cancelable: false
      });
      terminal.dispatchEvent(inputEvent);
      console.log("Dispatched input event");
      
      // Method 3: Dispatch paste event
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', text);
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
      });
      terminal.dispatchEvent(pasteEvent);
      console.log("Dispatched paste event");
      
      showToast("Pasted ✓", false);
      
    } catch (err) {
      console.error("✗ Paste failed:", err);
      showToast("Paste failed ✗", true);
    }
    return false;
  }
}, true);

// Also listen for the 'copy' event which xterm triggers
document.addEventListener('copy', (e) => {
  console.log("Native copy event detected");
  if (e.clipboardData) {
    const text = e.clipboardData.getData('text/plain');
    console.log("Copy event text:", text);
  }
}, true);

function showToast(msg, isError) {
  console.log("Toast:", msg);
  document.querySelectorAll('.aws-clipboard-toast').forEach(t => t.remove());
  
  const toast = document.createElement("div");
  toast.className = "aws-clipboard-toast";
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${isError ? '#f44336' : '#4caf50'};
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    font-family: sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
  `;
  
  (document.body || document.documentElement).appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
  });
  
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}