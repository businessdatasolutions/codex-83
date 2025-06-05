// js/ui.js
const UIManager = (function () {
    const terminalOutputEl = document.getElementById('terminalOutput');
    const commandInputEl = document.getElementById('commandInput');
    const blinkingCursorEl = document.getElementById('blinkingCursor');
    const countdownTimerEl = document.getElementById('countdownTimer');
    // puzzleModalEl is not used directly here, modalId is passed to show/hide

    function typeTextToTerminal(text, speed = 30, callback = () => { }) {
        if (!terminalOutputEl) return;
        let i = 0;
        const p = document.createElement('p');
        p.className = 'system-message';
        terminalOutputEl.appendChild(p);

        function typing() {
            if (i < text.length) {
                p.innerHTML += text.charAt(i);
                i++;
                terminalOutputEl.scrollTop = terminalOutputEl.scrollHeight;
                setTimeout(typing, speed);
            } else {
                if (callback) callback();
            }
        }
        typing();
    }

    function appendToTerminal(htmlOrText, className = 'system-message', isHtml = false) {
        if (!terminalOutputEl) return;
        const p = document.createElement('p');
        p.className = className;
        if (isHtml) {
            p.innerHTML = htmlOrText;
        } else {
            p.textContent = htmlOrText;
        }
        terminalOutputEl.appendChild(p);
        terminalOutputEl.scrollTop = terminalOutputEl.scrollHeight;
    }

    function appendPromptToTerminal(promptText, commandText) {
        if (!terminalOutputEl) return;
        const p = document.createElement('p');
        p.className = 'prompt';
        const promptSpan = document.createElement('span');
        promptSpan.textContent = promptText;
        p.appendChild(promptSpan);
        p.appendChild(document.createTextNode(commandText));
        terminalOutputEl.appendChild(p);
        terminalOutputEl.scrollTop = terminalOutputEl.scrollHeight;
    }


    function clearTerminal() {
        if (terminalOutputEl) terminalOutputEl.innerHTML = '';
    }

    function showModal(modalId = 'bayesianQuizModal') {
        console.log(`[UIManager.js] Attempting to show modal with ID: '${modalId}'`);
        const modal = document.getElementById(modalId);
        if (modal) {
            console.log(`[UIManager.js] Found modal element for '${modalId}':`, modal);
            modal.style.display = 'block';
            // The requestAnimationFrame log is good for debugging initial display state
            requestAnimationFrame(() => {
                console.log(`[UIManager.js] After setting display='block' for '${modalId}', computed display is:`, window.getComputedStyle(modal).display);
                console.log(`[UIManager.js] Modal visibility: ${window.getComputedStyle(modal).visibility}, opacity: ${window.getComputedStyle(modal).opacity}, z-index: ${window.getComputedStyle(modal).zIndex}`);
            });
        } else {
            console.error(`[UIManager.js] FAILED to find modal element with ID '${modalId}'!`);
        }
    }

    function hideModal(modalId = 'bayesianQuizModal') {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            console.log(`[UIManager.js] Modal with ID '${modalId}' hidden.`);
        } else {
            console.error(`[UIManager.js] FAILED to find modal element with ID '${modalId}' to hide!`);
        }
    }

    function updateCountdownDisplay(minutes, seconds) {
        if (countdownTimerEl) {
            countdownTimerEl.textContent = `TIME: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }
    function setCountdownColor(color) {
        if (countdownTimerEl) countdownTimerEl.style.color = color;
    }

    function disableTerminalInput() {
        if (commandInputEl) commandInputEl.disabled = true;
        if (blinkingCursorEl) blinkingCursorEl.style.display = 'none';
        console.log("[UIManager.js] Terminal input disabled.");
    }

    function enableTerminalInput() {
        if (commandInputEl) {
            commandInputEl.disabled = false;
            // commandInputEl.focus(); // Focus is often better handled by the calling context
        }
        if (blinkingCursorEl) blinkingCursorEl.style.display = 'inline-block';
        console.log("[UIManager.js] Terminal input enabled.");
    }

    function focusTerminalInput() {
        if (commandInputEl && !commandInputEl.disabled) {
            commandInputEl.focus();
            console.log("[UIManager.js] Terminal input focused.");
        }
    }

    function updateMapDisplay(content, show = true) {
        const mapDisplayEl = document.getElementById('mapDisplay');
        if (mapDisplayEl) {
            mapDisplayEl.textContent = content;
            mapDisplayEl.style.display = show ? 'block' : 'none';
        }
    }

    function updatePromptPrefix(prefix) {
        const promptPrefixEl = document.getElementById('promptPrefix');
        if (promptPrefixEl) promptPrefixEl.textContent = prefix;
    }


    return {
        typeTextToTerminal,
        appendToTerminal,
        appendPromptToTerminal,
        clearTerminal,
        showModal,
        hideModal,
        updateCountdownDisplay,
        setCountdownColor,
        disableTerminalInput,
        enableTerminalInput,
        focusTerminalInput,
        updateMapDisplay,
        updatePromptPrefix
    };
})();