class DataAnalysisPuzzle {
    constructor(puzzleId, config, UIManager, onSolveCallback, onCloseCallback) {
        this.id = puzzleId; // e.g., "dataPuzzle_teamA_puzzle1"
        this.config = config; // Expected: { title, instructionsText, correctKeys, keyCount, requiredKeysToPass, modalId, solutionCode (optional) }
        this.UIManager = UIManager;
        this.onSolve = onSolveCallback; // Callback: (isSuccessBoolean, solutionCodeStringOrNull)
        this.onClose = onCloseCallback; // Callback to signal main game to handle UI closure

        this.isSolvedInternally = false;
        this.elements = {};
        this.modalId = this.config.modalId || 'dataAnalysisModal';
    }

    init() {
        this.elements.modalEl = document.getElementById(this.modalId);
        if (!this.elements.modalEl) {
            console.error(`[DataAnalysisPuzzle] CRITICAL: Modal element with ID '${this.modalId}' not found!`);
            return;
        }
        this.elements.modalTitle = this.elements.modalEl.querySelector('#da_modal_title'); // Corrected selector
        this.elements.instructionsContainer = this.elements.modalEl.querySelector('#da_instructions_container');
        this.elements.keyInputArea = this.elements.modalEl.querySelector('#da_key_input_area');
        this.elements.feedbackArea = this.elements.modalEl.querySelector('#da_feedback_area');
        this.elements.submitKeysBtn = this.elements.modalEl.querySelector('#da_submit_keys_btn');
        this.elements.closeBtn = this.elements.modalEl.querySelector('#da_close_modal_btn');

        // Verify critical elements
        if (!this.elements.submitKeysBtn) console.error(`[DataAnalysisPuzzle] submitKeysBtn not found!`);
        if (!this.elements.closeBtn) console.error(`[DataAnalysisPuzzle] closeBtn not found!`);
        if (!this.elements.keyInputArea) console.error(`[DataAnalysisPuzzle] keyInputArea not found!`);


        this._setupEventListeners();
        console.log(`[DataAnalysisPuzzle] ${this.id} initialized.`);
    }

    _setupEventListeners() {
        if (this.elements.submitKeysBtn) {
            this.elements.submitKeysBtn.addEventListener('click', () => this._handleSubmitDataKeys());
        }
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => {
                this.hide();
                if (this.onClose) this.onClose();
            });
        }
    }

    _populateModalContent() {
        if (this.elements.modalTitle && this.config.title) {
            this.elements.modalTitle.textContent = this.config.title;
        } else if (this.elements.modalTitle) {
            this.elements.modalTitle.textContent = "DATA CORE CHALLENGE"; // Default title
        }

        if (this.elements.instructionsContainer && this.config.instructionsText) {
            const pre = document.createElement('pre');
            pre.textContent = this.config.instructionsText;
            this.elements.instructionsContainer.innerHTML = '';
            this.elements.instructionsContainer.appendChild(pre);
        }

        if (this.elements.keyInputArea) {
            this.elements.keyInputArea.innerHTML = ''; // Clear previous inputs
            const keyCount = this.config.keyCount || 5;
            for (let i = 1; i <= keyCount; i++) {
                const label = document.createElement('label');
                label.htmlFor = `da_key_input_${this.id}_${i}`;
                label.textContent = `KEY ${i}:`;
                const input = document.createElement('input');
                input.type = 'text';
                input.id = `da_key_input_${this.id}_${i}`; // Unique ID using puzzleId
                input.name = `da_key_input_${this.id}_${i}`;
                input.className = 'da-key-input';
                this.elements.keyInputArea.appendChild(label);
                this.elements.keyInputArea.appendChild(input);
                // Removed <br> - CSS should handle layout (e.g. label display:block or flex container)
            }
        }
        if (this.elements.feedbackArea) this.elements.feedbackArea.innerHTML = '';
    }

    _handleSubmitDataKeys() {
        if (!this.elements.keyInputArea || !this.elements.feedbackArea) {
            console.error("Missing key input or feedback area for submission.");
            return;
        }

        const submittedKeyValues = [];
        const keyCount = this.config.keyCount || 5;
        for (let i = 1; i <= keyCount; i++) {
            const inputElement = document.getElementById(`da_key_input_${this.id}_${i}`);
            submittedKeyValues.push(inputElement ? inputElement.value.trim() : '');
        }

        let correctCount = 0;
        this.elements.feedbackArea.innerHTML = '<p class="system-message">ANALYZING SUBMITTED KEYS...</p>';
        let resultsDisplay = "<ul>";
        const actualCorrectKeys = this.config.correctKeys || [];

        for (let i = 0; i < keyCount; i++) {
            const subValStr = submittedKeyValues[i];
            const corVal = actualCorrectKeys[i];
            let isCorrect = false;

            if (corVal === null || corVal === undefined) { // Check for explicit null/undefined for "no answer expected"
                isCorrect = (subValStr === '' || subValStr.toLowerCase() === 'none' || subValStr.toLowerCase() === 'null');
            } else if (subValStr !== '') { // Only compare if user submitted something
                if (typeof corVal === 'number') {
                    try {
                        const subValNum = parseFloat(subValStr);
                        if (!isNaN(subValNum)) {
                            // For integer comparison, check if both are very close to an integer
                            if (Math.abs(corVal - Math.round(corVal)) < 1e-9 && Math.abs(subValNum - Math.round(subValNum)) < 1e-9) {
                                isCorrect = Math.round(subValNum) === Math.round(corVal);
                            } else { // Floating point comparison
                                isCorrect = Math.abs(subValNum - corVal) < (this.config.floatTolerance || 0.00015);
                            }
                        }
                    } catch (e) { isCorrect = false; }
                } else if (typeof corVal === 'string') {
                    isCorrect = subValStr.trim().toLowerCase() === corVal.trim().toLowerCase();
                }
            }
            resultsDisplay += `<li>KEY ${i + 1}: Submitted '${subValStr === '' ? 'BLANK' : subValStr}' - ${isCorrect ? '<span class="success-message">MATCH!</span>' : '<span class="error-message">MISMATCH!</span>'}</li>`;
            if (isCorrect) correctCount++;
        }
        resultsDisplay += "</ul>";

        setTimeout(() => {
            if (!this.elements.feedbackArea) return;
            this.elements.feedbackArea.innerHTML = resultsDisplay; // Show individual key results
            const requiredKeys = this.config.requiredKeysToPass || 3;

            if (correctCount >= requiredKeys) {
                this.isSolvedInternally = true;
                this.elements.feedbackArea.innerHTML += `<p class="success-message" style="font-size: 1.1em; margin-top:10px;">>>> TRANSMISSION VALIDATED. ${correctCount}/${keyCount} KEYS MATCH. DATA STREAM STABILIZED. <<<</p>`;
                if (this.elements.submitKeysBtn) this.elements.submitKeysBtn.disabled = true;
                if (this.onSolve) this.onSolve(true, this.config.solutionCode || null);
            } else {
                this.isSolvedInternally = false;
                this.elements.feedbackArea.innerHTML += `<p class="error-message" style="font-size: 1.1em; margin-top:10px;">>>> TRANSMISSION CORRUPTED. ${correctCount}/${keyCount} KEYS VALIDATED. REQUIREMENT: ${requiredKeys}. SYSTEM LOCKOUT IMMINENT. RE-ANALYZE. <<<</p>`;
                if (this.onSolve) this.onSolve(false, null);
            }
        }, 700);
    }

    show() {
        if (!this.UIManager || typeof this.UIManager.showModal !== 'function') {
            console.error(`[DataAnalysisPuzzle] UIManager.showModal is not defined or UIManager itself is missing.`);
            return;
        }
        this.reset(); // Important: Reset content and state before showing
        this.UIManager.showModal(this.modalId);

        if (typeof this.UIManager.disableTerminalInput === 'function') {
            this.UIManager.disableTerminalInput();
        }
        console.log(`[DataAnalysisPuzzle] ${this.id} shown.`);
    }

    hide() {
        if (!this.UIManager || typeof this.UIManager.hideModal !== 'function') {
            console.error(`[DataAnalysisPuzzle] UIManager.hideModal is not defined or UIManager itself is missing.`);
            return;
        }
        this.UIManager.hideModal(this.modalId);

        if (typeof this.UIManager.enableTerminalInput === 'function') {
            this.UIManager.enableTerminalInput();
            if (typeof this.UIManager.focusTerminalInput === 'function') {
                this.UIManager.focusTerminalInput();
            }
        }
        console.log(`[DataAnalysisPuzzle] ${this.id} hidden.`);
    }

    reset() {
        this._populateModalContent(); // Refills instructions, clears/rebuilds inputs
        this.isSolvedInternally = false;
        if (this.elements.submitKeysBtn) this.elements.submitKeysBtn.disabled = false;
        if (this.elements.feedbackArea) this.elements.feedbackArea.innerHTML = '';
        console.log(`[DataAnalysisPuzzle] ${this.id} has been reset.`);
    }
}