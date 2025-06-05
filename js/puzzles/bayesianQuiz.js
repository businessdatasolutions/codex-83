// js/puzzles/bayesianQuiz.js

class BayesianQuizPuzzle {
    constructor(puzzleId, config, UIManager, onSolveCallback, onCloseCallback) {
        this.id = puzzleId;
        this.config = config;
        this.UIManager = UIManager;
        this.onSolve = onSolveCallback; // Callback when puzzle logic determines it's solved internally
        this.onClose = onCloseCallback; // Callback to signal main game to close this puzzle's UI

        this.isSolvedInternally = false;
        this.elements = {};

        this.narratives = [
            { id: 0, fullText: "INTEL REPORT SIGMA-7: NORAD early warning systems detect multiple unidentified aerial phenomena (UAPs). W.O.P.R. scenario modeling suggests <span class='common-base-rate-dynamic-text'>85%</span> are likely benign atmospheric distortions or civilian craft (FRIENDLY/UNKNOWN), while <span class='rare-base-rate-dynamic-text'>15%</span> match high-energy signatures consistent with potential enemy ballistic missiles (HOSTILE). A priority UAP has been flagged as HOSTILE by the primary sensor array. This array correctly classifies a contact's true nature <span class='detector-accuracy-dynamic-text'>80%</span> of the time.", rareItemName: "Hostile Missile Signature", rareItemNameShort: "HOSTILE", rareItemNamePlural: "Hostile Signatures", commonItemName: "Friendly/Unknown Contact", commonItemNameShort: "FRIENDLY", commonItemNamePlural: "Friendly/Unknown Contacts", detectorName: "NORAD Primary Array", contextQuery: "If the NORAD Primary Array flags a UAP as HOSTILE, what is the probability that the contact IS ACTUALLY a HOSTILE missile signature?", rareColorName: "dim red marker", commonColorName: "dim green marker" },
            { id: 1, fullText: "W.O.P.R. SIMULATION DELTA-9: Manufacturing new 'Peacekeeper' ICBMs. <span class='common-base-rate-dynamic-text'>85%</span> pass all quality checks (Type-P: Perfect), but <span class='rare-base-rate-dynamic-text'>15%</span> have latent guidance system flaws (Type-F: Flawed). An automated diagnostic protocol ('System Check Alpha') is run on each unit. 'System Check Alpha' correctly identifies a unit's true status (Perfect or Flawed) <span class='detector-accuracy-dynamic-text'>80%</span> of the time.", rareItemName: "Flawed ICBM (Type-F)", rareItemNameShort: "FLAWED", rareItemNamePlural: "Flawed ICBMs", commonItemName: "Perfect ICBM (Type-P)", commonItemNameShort: "PERFECT", commonItemNamePlural: "Perfect ICBMs", detectorName: "System Check Alpha", contextQuery: "If 'System Check Alpha' flags an ICBM as Type-F (Flawed), what is the probability it is truly flawed?", rareColorName: "dim red marker", commonColorName: "dim green marker" },
            { id: 2, fullText: "GLOBAL DEFENSE NETWORK ALERT: Monitoring for a rare, aggressive cyber-pathogen ('Cerberus Strain'). Current intel suggests <span class='rare-base-rate-dynamic-text'>15%</span> of critical network nodes are currently compromised (COMPROMISED), while <span class='common-base-rate-dynamic-text'>85%</span> remain secure (SECURE). A new heuristic scanner ('PathogenHunter v3.0') is deployed. It correctly identifies a node's status (COMPROMISED or SECURE) <span class='detector-accuracy-dynamic-text'>80%</span> of the time.", rareItemName: "Compromised Node (Cerberus)", rareItemNameShort: "COMPROMISED", rareItemNamePlural: "Compromised Nodes", commonItemName: "Secure Node", commonItemNameShort: "SECURE", commonItemNamePlural: "Secure Nodes", detectorName: "PathogenHunter v3.0", contextQuery: "If PathogenHunter v3.0 flags a node as COMPROMISED, what is the probability it actually is compromised by the Cerberus Strain?", rareColorName: "dim red marker", commonColorName: "dim green marker" }
        ];
        this.PARAMETER_SETS = [
            { rareItemCount: 15, detectorAccuracy: 0.80 }, { rareItemCount: 20, detectorAccuracy: 0.80 },
            { rareItemCount: 20, detectorAccuracy: 0.75 }, { rareItemCount: 20, detectorAccuracy: 0.85 },
            { rareItemCount: 25, detectorAccuracy: 0.80 }
        ];
        this.test3Questions = [
            { question: (narr) => `SYSTEM QUERY: What is the established base rate probability that any given contact is '<span class="quiz_rare-item-name-placeholder">${narr.rareItemNameShort}</span>'? (P(Actual <span class="quiz_rare-item-name-placeholder">${narr.rareItemNameShort}</span>)) Enter as decimal (e.g., 0.15).`, answer: () => parseFloat((this.quiz_currentRareItemCount / 100).toFixed(2)), format: "decimal" },
            { question: (narr) => `SYSTEM QUERY: What is the probability that the '<span class="quiz_detector-name-placeholder">${narr.detectorName}</span>' correctly identifies a contact if it is actually '<span class="quiz_rare-item-name-placeholder">${narr.rareItemNameShort}</span>'? (P(<span class="quiz_detector-name-placeholder">${narr.detectorName}</span> flags <span class="quiz_rare-item-name-placeholder">${narr.rareItemNameShort}</span> | Actual <span class="quiz_rare-item-name-placeholder">${narr.rareItemNameShort}</span>)) Enter as decimal.`, answer: () => parseFloat(this.quiz_currentDetectorAccuracy.toFixed(2)), format: "decimal" },
            { question: (narr) => `SYSTEM QUERY: What is the probability of a FALSE ALARM - the '<span class="quiz_detector-name-placeholder">${narr.detectorName}</span>' incorrectly flags a contact as '<span class="quiz_rare-item-name-placeholder">${narr.rareItemNameShort}</span>' if it is actually '<span class="quiz_common-item-name-placeholder">${narr.commonItemNameShort}</span>'? Enter as decimal.`, answer: () => parseFloat(this.quiz_currentDetectorInaccuracyCommon.toFixed(2)), format: "decimal" },
            { question: (narr) => `SYSTEM QUERY: Overall, what is the probability that the '<span class="quiz_detector-name-placeholder">${narr.detectorName}</span>' will flag ANY contact as '<span class="quiz_rare-item-name-placeholder">${narr.rareItemNameShort}</span>', regardless of its true nature? (P(<span class="quiz_detector-name-placeholder">${narr.detectorName}</span> flags <span class="quiz_rare-item-name-placeholder">${narr.rareItemNameShort}</span>)) Enter as decimal.`, answer: () => parseFloat(((this.quiz_currentExpectedRareCorrectly + this.quiz_currentExpectedCommonIncorrectly) / 100).toFixed(2)), format: "decimal" }
        ];

        this.quiz_currentNarrative = null;
        this.quiz_cellsData = [];
        this.quiz_clickedRareCount = 0;
        this.quiz_clickedCommonCount = 0;
    }

    init() {
        // Cache DOM elements. Ensure all IDs are correct as per index.html
        this.elements.narrativeTextEl = document.getElementById('quiz_narrative-text');
        this.elements.rareItemNamePluralEl = document.getElementById('quiz_rare-item-name-plural');
        this.elements.commonItemNamePluralEl = document.getElementById('quiz_common-item-name-plural');
        this.elements.detectorNameEl = document.getElementById('quiz_detector-name');
        this.elements.baseRateRareSpan = document.querySelector('#bayesianQuizModal .base-rate-dynamic-text-rare');
        this.elements.baseRateCommonSpan = document.querySelector('#bayesianQuizModal .base-rate-dynamic-text-common');
        this.elements.detectorAccuracySpan = document.querySelector('#bayesianQuizModal .detector-accuracy-dynamic-text');
        this.elements.detectorErrorSpan = document.querySelector('#bayesianQuizModal .detector-error-dynamic-text');
        this.elements.gridEl = document.getElementById('quiz_grid');
        this.elements.clickedRareCorrectlyEl = document.getElementById('quiz_clicked-rare-correctly');
        this.elements.clickedCommonIncorrectlyEl = document.getElementById('quiz_clicked-common-incorrectly');
        this.elements.submitTest1Btn = document.getElementById('quiz_submit-test1');
        this.elements.feedbackTest1El = document.getElementById('quiz_feedback-test1');
        this.elements.contextualBayesFormulaContainerEl = document.getElementById('quiz_contextualBayesFormulaContainer');
        this.elements.probInputTest2El = document.getElementById('quiz_prob-input-test2');
        this.elements.submitTest2Btn = document.getElementById('quiz_submit-test2');
        this.elements.feedbackTest2El = document.getElementById('quiz_feedback-test2');
        this.elements.questionTest3El = document.getElementById('quiz_question-test3');
        this.elements.labelTest3El = document.getElementById('quiz_label-test3');
        this.elements.probInputTest3El = document.getElementById('quiz_prob-input-test3');
        this.elements.submitTest3Btn = document.getElementById('quiz_submit-test3');
        this.elements.feedbackTest3El = document.getElementById('quiz_feedback-test3');
        this.elements.nextQuizBtn = document.getElementById('quiz_next-quiz');

        // Verify all elements were found (optional, for robust debugging)
        for (const key in this.elements) {
            if (!this.elements[key]) {
                console.error(`[BayesianQuiz.js] init(): Element for '${key}' not found! Check ID in HTML and JS.`);
            }
        }

        this._setupEventListeners();
        this.resetAndLoadNewScenario(); // Initial setup of quiz content
        console.log(`[BayesianQuiz.js] Puzzle ${this.id} initialized.`);
    }

    _setupEventListeners() {
        if (this.elements.submitTest1Btn) this.elements.submitTest1Btn.addEventListener('click', () => this._handleSubmitTest1());
        if (this.elements.submitTest2Btn) this.elements.submitTest2Btn.addEventListener('click', () => this._handleSubmitTest2());
        if (this.elements.submitTest3Btn) this.elements.submitTest3Btn.addEventListener('click', () => this._handleSubmitTest3());
        if (this.elements.nextQuizBtn) this.elements.nextQuizBtn.addEventListener('click', () => this.resetAndLoadNewScenario());
    }

    _setupCurrentProbabilities() {
        const randomIndex = Math.floor(Math.random() * this.PARAMETER_SETS.length);
        const selectedParams = this.PARAMETER_SETS[randomIndex];
        this.quiz_currentRareItemCount = selectedParams.rareItemCount;
        this.quiz_currentCommonItemCount = 100 - this.quiz_currentRareItemCount;
        this.quiz_currentDetectorAccuracy = selectedParams.detectorAccuracy;
        this.quiz_currentDetectorInaccuracyCommon = parseFloat((1 - this.quiz_currentDetectorAccuracy).toFixed(2)); // e.g., 0.20 if accuracy is 0.80
        this.quiz_currentExpectedRareCorrectly = Math.round(this.quiz_currentRareItemCount * this.quiz_currentDetectorAccuracy);
        this.quiz_currentExpectedCommonIncorrectly = Math.round(this.quiz_currentCommonItemCount * this.quiz_currentDetectorInaccuracyCommon);

        let rawProb = (this.quiz_currentExpectedRareCorrectly / (this.quiz_currentExpectedRareCorrectly + this.quiz_currentExpectedCommonIncorrectly)) * 100;
        if (isNaN(rawProb) || !isFinite(rawProb) || (this.quiz_currentExpectedRareCorrectly + this.quiz_currentExpectedCommonIncorrectly === 0)) {
            rawProb = 0; // Handle division by zero or NaN
        }
        this.quiz_currentCorrectProbTest2 = parseFloat(rawProb.toFixed(2));
        this.quiz_currentTest2LowerBound = Math.floor(rawProb * 10) / 10; // e.g. 55.5 for 55.56
        this.quiz_currentTest2UpperBound = parseFloat((this.quiz_currentTest2LowerBound + 0.1).toFixed(1)); // e.g. 55.6
    }

    resetAndLoadNewScenario() {
        console.log("[BayesianQuiz.js] resetAndLoadNewScenario called.");
        try {
            this._setupCurrentProbabilities();
            this._loadRandomNarrative(); // Must be after _setupCurrentProbabilities
            this._createGrid();          // Must be after _setupCurrentProbabilities
            this._setupTest3();          // Must be after _loadRandomNarrative for placeholders
            this._resetTestStates();     // Resets UI elements and internal state

            // Update placeholders after narrative and probabilities are set
            if (this.quiz_currentNarrative) {
                this._updatePlaceholdersInHTML(this.quiz_currentNarrative);
            }
            // Update Test 3 question text, which might depend on the narrative
            if (this.quiz_currentTest3QuestionData && this.quiz_currentNarrative && this.elements.questionTest3El) {
                this.elements.questionTest3El.innerHTML = this.quiz_currentTest3QuestionData.question(this.quiz_currentNarrative);
            }

            console.log("[BayesianQuiz.js] Scenario reset and loaded.");
        } catch (error) {
            console.error("[BayesianQuiz.js] CRITICAL ERROR in resetAndLoadNewScenario:", error);
            // Optionally, inform the user via UIManager if possible and safe
            if (this.UIManager && this.UIManager.appendToTerminal) {
                this.UIManager.appendToTerminal("ERROR: Data Analysis Subroutine encountered a critical fault during recalibration. Module may be unstable.", "error-message");
            }
        }
    }

    _resetTestStates() {
        this.quiz_clickedRareCount = 0;
        this.quiz_clickedCommonCount = 0;
        this._updateClickCounters();

        if (this.elements.feedbackTest1El) { this.elements.feedbackTest1El.innerHTML = ""; this.elements.feedbackTest1El.className = "feedback"; }
        if (this.elements.feedbackTest2El) { this.elements.feedbackTest2El.innerHTML = ""; this.elements.feedbackTest2El.className = "feedback"; }
        if (this.elements.feedbackTest3El) { this.elements.feedbackTest3El.innerHTML = ""; this.elements.feedbackTest3El.className = "feedback"; }
        if (this.elements.probInputTest2El) this.elements.probInputTest2El.value = "";
        if (this.elements.probInputTest3El) this.elements.probInputTest3El.value = "";

        let existingReturnButton = document.getElementById('quiz_returnToTerminalBtn');
        if (existingReturnButton) existingReturnButton.remove();

        if (this.quiz_cellsData && this.quiz_cellsData.length > 0) {
            this.quiz_cellsData.forEach(cellObj => {
                if (cellObj.element) {
                    cellObj.element.classList.remove('cell-selected-test1-rare', 'cell-selected-test1-common');
                    cellObj.element.classList.remove('cell-rare', 'cell-common'); // Remove potentially old type
                    cellObj.element.classList.add(cellObj.originalType === 'rare' ? 'cell-rare' : 'cell-common');
                }
                cellObj.clickedForTest1 = false;
            });
        }
        this.isSolvedInternally = false;
    }

    _updatePlaceholdersInHTML(narr) {
        if (!narr) { console.warn("Attempted to update placeholders with no narrative."); return; }

        // Ensure all elements exist before trying to update them
        const getElement = (el) => {
            if (!el) {
                // console.warn(`Placeholder update: Element for a span/text not found.`);
                return { textContent: '' }; // Return a dummy object to prevent errors
            }
            return el;
        };

        const rareBaseRatePercentText = `${this.quiz_currentRareItemCount}%`;
        const commonBaseRatePercentText = `${this.quiz_currentCommonItemCount}%`;
        const detectorAccuracyPercentText = `${this.quiz_currentDetectorAccuracy * 100}%`;
        const detectorErrorPercentText = `${(this.quiz_currentDetectorInaccuracyCommon * 100).toFixed(0)}%`; // Use stored inaccuracy

        getElement(this.elements.baseRateRareSpan).textContent = rareBaseRatePercentText;
        getElement(this.elements.baseRateCommonSpan).textContent = commonBaseRatePercentText;
        getElement(this.elements.detectorAccuracySpan).textContent = detectorAccuracyPercentText;
        getElement(this.elements.detectorErrorSpan).textContent = detectorErrorPercentText;

        getElement(this.elements.rareItemNamePluralEl).textContent = narr.rareItemNamePlural;
        getElement(this.elements.commonItemNamePluralEl).textContent = narr.commonItemNamePlural;
        getElement(this.elements.detectorNameEl).textContent = narr.detectorName;

        document.querySelectorAll('#bayesianQuizModal .quiz_rare-item-name-placeholder').forEach(el => el.textContent = narr.rareItemNameShort);
        document.querySelectorAll('#bayesianQuizModal .quiz_rare-item-name-plural-placeholder').forEach(el => el.textContent = narr.rareItemNamePlural);
        document.querySelectorAll('#bayesianQuizModal .quiz_common-item-name-placeholder').forEach(el => el.textContent = narr.commonItemNameShort);
        document.querySelectorAll('#bayesianQuizModal .quiz_common-item-name-plural-placeholder').forEach(el => el.textContent = narr.commonItemNamePlural);
        document.querySelectorAll('#bayesianQuizModal .quiz_detector-name-placeholder').forEach(el => el.textContent = narr.detectorName);
        document.querySelectorAll('#bayesianQuizModal .quiz_rare-color-name').forEach(el => el.textContent = narr.rareColorName);
        document.querySelectorAll('#bayesianQuizModal .quiz_common-color-name').forEach(el => el.textContent = narr.commonColorName);
        document.querySelectorAll('#bayesianQuizModal .quiz_rare-item-name-placeholder-bayes-text').forEach(el => el.textContent = narr.rareItemNameShort);
        document.querySelectorAll('#bayesianQuizModal .quiz_detector-name-placeholder-bayes-text').forEach(el => el.textContent = narr.detectorName);

        const actualRareTerm = narr.rareItemNameShort.replace(/ /g, '\\_');
        const detectorTerm = narr.detectorName.replace(/ /g, '\\_');
        const tex_ActualRare = `\\text{Actual:${actualRareTerm}}`;
        const tex_DetectorSaysActualRare = `\\text{${detectorTerm}:Flags:${actualRareTerm}}`;
        const P_ActualRare_Display = `P(${tex_ActualRare})`;
        const P_DetectorSaysActualRare_given_ActualRare_Display = `P(${tex_DetectorSaysActualRare} | ${tex_ActualRare})`;
        const P_DetectorSaysActualRare_Display = `P(${tex_DetectorSaysActualRare})`;
        const tex_PosteriorLeftHandSide = `P(${tex_ActualRare} | ${tex_DetectorSaysActualRare})`;
        const formulaString = `$$${tex_PosteriorLeftHandSide} = \\frac{${P_DetectorSaysActualRare_given_ActualRare_Display} \\cdot ${P_ActualRare_Display}}{${P_DetectorSaysActualRare_Display}}$$`;

        if (this.elements.contextualBayesFormulaContainerEl) {
            this.elements.contextualBayesFormulaContainerEl.innerHTML = formulaString;
        }

        if (typeof MathJax !== "undefined" && MathJax.typesetPromise && this.elements.contextualBayesFormulaContainerEl) {
            MathJax.typesetPromise([this.elements.contextualBayesFormulaContainerEl]).catch((err) => console.error('MathJax typesetting error:', err));
        } else if (!this.elements.contextualBayesFormulaContainerEl) {
            console.warn("MathJax typesetting skipped: contextualBayesFormulaContainerEl not found.");
        } else if (typeof MathJax === "undefined" || !MathJax.typesetPromise) {
            console.warn("MathJax typesetting skipped: MathJax or MathJax.typesetPromise not available.");
        }
    }

    _loadRandomNarrative() {
        const randomIndex = Math.floor(Math.random() * this.narratives.length);
        this.quiz_currentNarrative = this.narratives[randomIndex];
        if (!this.elements.narrativeTextEl || !this.quiz_currentNarrative) {
            console.warn("_loadRandomNarrative: narrativeTextEl or quiz_currentNarrative is missing.");
            if (this.elements.narrativeTextEl) this.elements.narrativeTextEl.innerHTML = "Error loading narrative.";
            return;
        }
        let tempFullText = this.quiz_currentNarrative.fullText;
        // Ensure values are numbers before using toFixed or calculations
        const rarePercent = typeof this.quiz_currentRareItemCount === 'number' ? this.quiz_currentRareItemCount : 0;
        const commonPercent = typeof this.quiz_currentCommonItemCount === 'number' ? this.quiz_currentCommonItemCount : 0;
        const accuracyPercent = typeof this.quiz_currentDetectorAccuracy === 'number' ? this.quiz_currentDetectorAccuracy * 100 : 0;

        tempFullText = tempFullText.replace(/<span class='rare-base-rate-dynamic-text'>.*?<\/span>/g, `<span class='rare-base-rate-dynamic-text'>${rarePercent}%</span>`);
        tempFullText = tempFullText.replace(/<span class='common-base-rate-dynamic-text'>.*?<\/span>/g, `<span class='common-base-rate-dynamic-text'>${commonPercent}%</span>`);
        tempFullText = tempFullText.replace(/<span class='detector-accuracy-dynamic-text'>.*?<\/span>/g, `<span class='detector-accuracy-dynamic-text'>${accuracyPercent.toFixed(0)}%</span>`);
        this.elements.narrativeTextEl.innerHTML = tempFullText + "<br><br><strong>W.O.P.R. QUERY:</strong> " + this.quiz_currentNarrative.contextQuery;
    }

    _createGrid() {
        if (!this.elements.gridEl) { console.warn("_createGrid: gridEl is missing."); return; }
        this.elements.gridEl.innerHTML = '';
        this.quiz_cellsData = [];
        const rareCount = typeof this.quiz_currentRareItemCount === 'number' ? this.quiz_currentRareItemCount : 0;

        for (let i = 0; i < 100; i++) {
            const cell = document.createElement('div'); cell.classList.add('grid-cell');
            const itemType = (i < rareCount) ? 'rare' : 'common';
            cell.dataset.originalType = itemType;
            cell.classList.add(itemType === 'rare' ? 'cell-rare' : 'cell-common');
            const cellObj = { element: cell, originalType: itemType, clickedForTest1: false };
            this.quiz_cellsData.push(cellObj);
            cell.addEventListener('click', () => this._handleCellClick(cellObj));
            this.elements.gridEl.appendChild(cell);
        }
    }

    _handleCellClick(cellObj) {
        if (!cellObj || !cellObj.element) return;
        cellObj.clickedForTest1 = !cellObj.clickedForTest1;
        const isRare = cellObj.originalType === 'rare';
        if (cellObj.clickedForTest1) {
            if (isRare) { this.quiz_clickedRareCount++; cellObj.element.classList.add('cell-selected-test1-rare'); }
            else { this.quiz_clickedCommonCount++; cellObj.element.classList.add('cell-selected-test1-common'); }
        } else {
            if (isRare) { this.quiz_clickedRareCount--; cellObj.element.classList.remove('cell-selected-test1-rare'); }
            else { this.quiz_clickedCommonCount--; cellObj.element.classList.remove('cell-selected-test1-common'); }
        }
        this._updateClickCounters();
    }

    _updateClickCounters() {
        if (this.elements.clickedRareCorrectlyEl) {
            this.elements.clickedRareCorrectlyEl.textContent = this.quiz_clickedRareCount;
        }
        if (this.elements.clickedCommonIncorrectlyEl) {
            this.elements.clickedCommonIncorrectlyEl.textContent = this.quiz_clickedCommonCount;
        }
    }

    _handleSubmitTest1() {
        if (!this.elements.feedbackTest1El) return;
        const correctRare = this.quiz_clickedRareCount === this.quiz_currentExpectedRareCorrectly;
        const correctCommon = this.quiz_clickedCommonCount === this.quiz_currentExpectedCommonIncorrectly;
        if (correctRare && correctCommon) {
            this.elements.feedbackTest1El.innerHTML = `GRID ANALYSIS VALIDATED. Target group correctly identified. Detected <span style="color:var(--monitor-accent)">${this.quiz_currentExpectedRareCorrectly}</span> direct threats & <span style="color:var(--monitor-highlight)">${this.quiz_currentExpectedCommonIncorrectly}</span> false positives. Proceed to probability assessment.`;
            this.elements.feedbackTest1El.className = 'feedback feedback-correct';
        } else {
            this.elements.feedbackTest1El.innerHTML = `ANALYSIS ERROR. Incorrect grid selection. Expected true threats flagged: ${this.quiz_currentExpectedRareCorrectly}. Expected false positives flagged: ${this.quiz_currentExpectedCommonIncorrectly}. Recalculate sensor interpretation. Your selection: ${this.quiz_clickedRareCount} true threats, ${this.quiz_clickedCommonCount} false positives.`;
            this.elements.feedbackTest1El.className = 'feedback feedback-incorrect';
        }
    }

    _handleSubmitTest2() {
        if (!this.elements.probInputTest2El || !this.elements.feedbackTest2El) return;
        const userAnswer = parseFloat(this.elements.probInputTest2El.value);

        // Ensure bounds are numbers for comparison
        const lowerBound = typeof this.quiz_currentTest2LowerBound === 'number' ? this.quiz_currentTest2LowerBound : -Infinity;
        const upperBound = typeof this.quiz_currentTest2UpperBound === 'number' ? this.quiz_currentTest2UpperBound : Infinity;

        if (!isNaN(userAnswer) && userAnswer >= lowerBound && userAnswer <= upperBound) {
            this.isSolvedInternally = true; // Mark puzzle as internally solved
            this.elements.feedbackTest2El.innerHTML = `PROBABILITY ASSESSMENT ACCURATE (${userAnswer}%). Falls within tolerance (${lowerBound}% - ${upperBound}%). Actual: ${this.quiz_currentCorrectProbTest2}%.<br> <strong style="color:var(--monitor-text); font-size: 1.2em; background: var(--monitor-text-dim); padding: 2px 5px;">ACCESS CODE DECRYPTED: PROTOCOMM_X25</strong><br>`;
            this.elements.feedbackTest2El.className = 'feedback feedback-correct';

            let returnButton = document.getElementById('quiz_returnToTerminalBtn');
            if (!returnButton) {
                returnButton = document.createElement('button');
                returnButton.id = 'quiz_returnToTerminalBtn';
                returnButton.textContent = "Return to W.O.P.R. Terminal";
                returnButton.onclick = () => {
                    if (this.onClose) this.onClose(); // Signal main game to handle closure
                };
                this.elements.feedbackTest2El.appendChild(returnButton);
            }
            // Notify main game engine of success and revealed code
            if (this.onSolve) this.onSolve(true, "PROTOCOMM_X25");
        } else {
            this.isSolvedInternally = false;
            this.elements.feedbackTest2El.innerHTML = `PROBABILITY ASSESSMENT FAILED. Value ${!isNaN(userAnswer) ? userAnswer + '%' : 'INVALID'} outside operational tolerance. Expected range: ${lowerBound}% - ${upperBound}%. Recalibrate analysis.`;
            this.elements.feedbackTest2El.className = 'feedback feedback-incorrect';
            if (this.onSolve) this.onSolve(false, null); // Notify main game engine of failure
        }
    }

    _setupTest3() {
        const randomIndex = Math.floor(Math.random() * this.test3Questions.length);
        this.quiz_currentTest3QuestionData = this.test3Questions[randomIndex];
        if (this.quiz_currentNarrative && this.quiz_currentTest3QuestionData && this.elements.questionTest3El && this.elements.labelTest3El && this.elements.probInputTest3El && this.elements.feedbackTest3El) {
            this.elements.questionTest3El.innerHTML = this.quiz_currentTest3QuestionData.question(this.quiz_currentNarrative);
            this.elements.labelTest3El.textContent = `RESPONSE VALUE (${this.quiz_currentTest3QuestionData.format}):`;
            this.elements.probInputTest3El.value = "";
            this.elements.feedbackTest3El.innerHTML = "";
            this.elements.feedbackTest3El.className = "feedback";
        } else {
            // console.warn("_setupTest3: Could not set up Test 3 question due to missing elements or data.");
        }
    }

    _handleSubmitTest3() {
        if (!this.quiz_currentTest3QuestionData || !this.elements.probInputTest3El || !this.elements.feedbackTest3El) return;
        const userAnswer = parseFloat(this.elements.probInputTest3El.value);
        let correctAnswer = this.quiz_currentTest3QuestionData.answer(); // This is a function call

        if (!isNaN(userAnswer) && typeof correctAnswer === 'number' && Math.abs(userAnswer - correctAnswer) < (this.quiz_currentTest3QuestionData.format === "percentage" ? 0.01 : 0.001)) {
            this.elements.feedbackTest3El.innerHTML = `PARAMETER RESPONSE VALIDATED. Correct value: ${correctAnswer}${this.quiz_currentTest3QuestionData.format === "percentage" ? "%" : ""}.`;
            this.elements.feedbackTest3El.className = 'feedback feedback-correct';
        } else {
            this.elements.feedbackTest3El.innerHTML = `PARAMETER RESPONSE INVALID. Correct value is ${correctAnswer}${this.quiz_currentTest3QuestionData.format === "percentage" ? "%" : ""}. Your input: ${!isNaN(userAnswer) ? userAnswer : 'INVALID'}.`;
            this.elements.feedbackTest3El.className = 'feedback feedback-incorrect';
        }
    }

    show() {
        console.log("[BayesianQuiz.js] show() method called.");
        console.log("[BayesianQuiz.js] this.UIManager object:", this.UIManager);

        if (this.UIManager && typeof this.UIManager.showModal === 'function') {
            console.log("[BayesianQuiz.js] UIManager.showModal IS a function. Calling it.");
            this.UIManager.showModal('bayesianQuizModal'); // Puzzle's specific modal ID
        } else {
            console.error("[BayesianQuiz.js] ERROR: UIManager is not defined or showModal is not a function!", this.UIManager);
            return; // Can't proceed if UIManager or showModal is missing
        }

        if (this.UIManager && typeof this.UIManager.disableTerminalInput === 'function') {
            this.UIManager.disableTerminalInput();
        } else {
            console.error("[BayesianQuiz.js] ERROR: UIManager.disableTerminalInput is not a function!");
        }

        // The user's original comment indicated this line might be problematic.
        // If problems persist with the modal disappearing, this is the prime suspect for errors.
        // Ensure all elements are correctly fetched in init() and MathJax is working.
        this.resetAndLoadNewScenario();

        // Update log message based on whether resetAndLoadNewScenario was run (it is, above)
        console.log("[BayesianQuiz.js] Post UIManager.showModal. resetAndLoadNewScenario has been executed.");
    }

    hide() {
        console.log(`[BayesianQuiz.js] hide() method called for puzzle ${this.id}.`);
        if (this.UIManager && typeof this.UIManager.hideModal === 'function') {
            this.UIManager.hideModal('bayesianQuizModal'); // Puzzle's specific modal ID
        } else {
            console.error(`[BayesianQuiz.js] Error: UIManager.hideModal is not a function for puzzle ${this.id}.`);
        }

        if (this.UIManager && typeof this.UIManager.enableTerminalInput === 'function') {
            this.UIManager.enableTerminalInput();
            // It's good practice to also refocus the terminal if it's being re-enabled.
            if (typeof this.UIManager.focusTerminalInput === 'function') {
                this.UIManager.focusTerminalInput();
            }
        } else {
            console.error(`[BayesianQuiz.js] Error: UIManager.enableTerminalInput is not a function for puzzle ${this.id}.`);
        }
        console.log(`[BayesianQuiz.js] Puzzle ${this.id} UI hidden and terminal re-enabled.`);
    }

    reset() {
        // Called when reusing an existing puzzle instance.
        // Resets internal state and reloads scenario data.
        // Does NOT show the UI; `show()` is responsible for that.
        this.isSolvedInternally = false;
        this.resetAndLoadNewScenario();
        console.log(`[BayesianQuiz.js] Puzzle ${this.id} has been reset.`);
    }
}