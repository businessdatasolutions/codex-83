// js/main.js
document.addEventListener('DOMContentLoaded', () => {
    const commandInputEl = document.getElementById('commandInput');
    const splashScreenEl = document.getElementById('splashScreen');
    const bootTextEl = document.getElementById('bootText');
    const progressBarEl = document.getElementById('progressBar');
    const splashContinueEl = document.getElementById('splashContinue');
    const promptPrefixEl = document.getElementById('promptPrefix');

    let isGameReady = false;
    let currentRoomId = null;
    let rooms = {};
    let countdownInterval;
    let timeLeft = 3600;

    const puzzleTerminalSolutions = {
        room1: "PROTOCOMM_X25",
        room2: "ALPHA_DELTA_7",
        room3: "ZERO_SUM",
        room4: "DISENGAGE_THETA_SIGMA",
        room5: "JOSHUA"
    };
    const unlockedRooms = { room1: false, room2: false, room3: false, room4: false, room5: false };
    let activePuzzleInstance = null;

    const bootSequenceLines = [
        "W.O.P.R. BIOS V3.8 INITIALIZING...", "MEMORY TEST: 65536K OK", "CPU: ZILOG Z80 @ 4MHZ - OPERATIONAL",
        "FDC: WD1770 - DISKETTE SYSTEM ONLINE", "MODEM: HAYES SMARTMODEM 1200 - CARRIER DETECTED AT 300 BAUD",
        "SYSTEM CLOCK: INITIALIZED", "LOADING JOSHUA OS KERNEL...", "KERNEL LOADED. STARTING SYSTEM SERVICES.",
        "NETWORK INTERFACE: ARPANET NODE 734 ONLINE", "SECURITY SUBSYSTEM: ACTIVE - LEVEL 5 CLEARANCE REQUIRED",
        "GLOBAL THERMONUCLEAR WAR SIMULATION MODULE: STANDBY", "AWAITING USER INPUT...", ""
    ];

    function runBootSequence(lineIndex = 0, progress = 0) {
        if (!bootTextEl || !progressBarEl || !splashContinueEl) {
            console.error("Boot sequence elements not found!");
            initializeGame();
            return;
        }
        if (lineIndex < bootSequenceLines.length) {
            bootTextEl.textContent += bootSequenceLines[lineIndex] + '\n';
            progress += (100 / bootSequenceLines.length);
            progressBarEl.style.width = Math.min(progress, 100) + '%';
            setTimeout(() => runBootSequence(lineIndex + 1, progress), 80 + Math.random() * 80);
        } else {
            bootTextEl.textContent += "READY.\n";
            splashContinueEl.classList.remove('hidden');
            document.addEventListener('keypress', startGameFromSplash, { once: true });
        }
    }

    function startGameFromSplash() {
        if (splashScreenEl) {
            splashScreenEl.style.transition = 'opacity 1s ease-out';
            splashScreenEl.style.opacity = '0';
            setTimeout(() => {
                if (splashScreenEl) splashScreenEl.style.display = 'none';
                initializeGame();
            }, 1000);
        } else {
            initializeGame();
        }
    }

    function startCountdown() {
        clearInterval(countdownInterval); // Clear existing interval if any
        countdownInterval = setInterval(() => {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            UIManager.updateCountdownDisplay(minutes, seconds);

            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                gameOver("TIME'S UP! GLOBAL THERMONUCLEAR WAR INITIATED.");
            }
            if (timeLeft < 300 && timeLeft % 2 === 0) {
                const timerEl = document.getElementById('countdownTimer');
                if (timerEl) UIManager.setCountdownColor(timerEl.style.color === 'var(--monitor-accent)' ? 'white' : 'var(--monitor-accent)');
            } else if (timeLeft >= 300) {
                UIManager.setCountdownColor('var(--monitor-accent)');
            }
        }, 1000);
    }

    function handlePuzzleClose() {
        console.log("[Main.js] handlePuzzleClose called.");
        if (activePuzzleInstance && typeof activePuzzleInstance.hide === 'function') {
            activePuzzleInstance.hide(); // This will now hide modal & re-enable terminal via puzzle's hide method
        } else if (activePuzzleInstance) {
            console.warn("[Main.js] activePuzzleInstance.hide is not a function. Manually attempting to close.");
            UIManager.hideModal(); // Fallback, assuming 'bayesianQuizModal' or puzzle default
            UIManager.enableTerminalInput();
            UIManager.focusTerminalInput();
        }
        UIManager.appendToTerminal("DATA ANALYSIS MODULE interface closed. Terminal reactivated.", "system-message");
    }

    function handlePuzzleSolvedByPlayer(puzzleSuccess, revealedCode) {
        console.log(`[Main.js] handlePuzzleSolvedByPlayer called. Success: ${puzzleSuccess}, Code: ${revealedCode}`);
        if (puzzleSuccess && revealedCode) {
            UIManager.appendToTerminal(`DATA ANALYSIS MODULE: Internal assessment complete. ACCESS CODE FRAGMENT: ${revealedCode}`, "success-message");
            UIManager.appendToTerminal("Submit this code to the terminal using the SOLVE command to proceed.", "system-message highlight");
        } else if (puzzleSuccess) {
            UIManager.appendToTerminal("DATA ANALYSIS MODULE: Internal assessment successful.", "success-message");
        } else {
            UIManager.appendToTerminal("DATA ANALYSIS MODULE: Internal assessment failed. Re-evaluate parameters or retry module.", "error-message");
        }
        // The puzzle UI is typically closed by the player (e.g. clicking a "Return to Terminal" button inside the puzzle)
        // which would trigger handlePuzzleClose.
    }

    function initializeRooms() {
        rooms = {
            room1: {
                id: "room1", name: "NORAD - Secure Modem Interface", unlocked: true, completed: false,
                description: "ACCESSING DATA ANALYSIS MODULE...\nTo proceed, you must analyze the provided statistical scenario in the external module. \nComplete the analysis to retrieve the protocol command.\nThe module will appear on your screen. Once done, use its 'Return to Terminal' button, then submit the retrieved code using 'SOLVE <command>'.",
                puzzleId: "bayesianRoom1",
                puzzleType: "BayesianQuiz",
                onEnter: function () {
                    console.log("[Main.js] Entering Room 1: " + this.name);
                    UIManager.appendToTerminal(`\nSYSTEM: ACCESSING ${this.name}...`, 'system-message');
                    UIManager.appendToTerminal(this.description, 'room-content', true); // true for isHtml
                    UIManager.updatePromptPrefix("MODEM_R1>");

                    if (typeof BayesianQuizPuzzle !== 'undefined') {
                        console.log("[Main.js] BayesianQuizPuzzle class found.");
                        if (!activePuzzleInstance || activePuzzleInstance.id !== this.puzzleId) {
                            console.log("[Main.js] Creating new instance of BayesianQuizPuzzle for puzzleId:", this.puzzleId);
                            activePuzzleInstance = new BayesianQuizPuzzle(
                                this.puzzleId,
                                {}, // Config for BayesianQuizPuzzle if needed
                                UIManager,
                                handlePuzzleSolvedByPlayer,
                                handlePuzzleClose
                            );
                            if (typeof activePuzzleInstance.init === 'function') {
                                activePuzzleInstance.init();
                            } else {
                                console.error("[Main.js] Newly created puzzle instance does not have an init method!");
                                UIManager.appendToTerminal("CRITICAL ERROR: FAILED TO INITIALIZE DATA ANALYSIS MODULE.", "error-message");
                                return;
                            }
                        } else {
                            console.log("[Main.js] Reusing existing BayesianQuizPuzzle instance, calling reset.");
                            if (typeof activePuzzleInstance.reset === 'function') {
                                activePuzzleInstance.reset();
                            } else {
                                console.error("[Main.js] Existing puzzle instance does not have a reset method!");
                                // Potentially re-create if reset is missing
                            }
                        }

                        if (activePuzzleInstance && typeof activePuzzleInstance.show === 'function') {
                            activePuzzleInstance.show();
                            console.log("[Main.js] Called .show() on BayesianQuizPuzzle instance.");
                        } else {
                            console.error("[Main.js] Puzzle instance does not have a show method or is null!");
                            UIManager.appendToTerminal("CRITICAL ERROR: FAILED TO DISPLAY DATA ANALYSIS MODULE.", "error-message");
                        }
                    } else {
                        console.error("[Main.js] BayesianQuizPuzzle class is NOT defined! Check script load order or errors in bayesianQuiz.js.");
                        UIManager.appendToTerminal("CRITICAL ERROR: DATA ANALYSIS MODULE UNAVAILABLE.", "error-message");
                    }
                }
            },
            // Other rooms...
            room2: {
                id: "room2", name: "W.O.P.R. - Mainframe Core Access", unlocked: false, completed: false,
                description: "You're at the gateway to the W.O.P.R. mainframe. Security is tight. Decrypt the access key.",
                puzzleText: "Intercepted comms mention 'Project C.H.A.O.S.' and a cipher key rotation based on Greek alphabet positions. Last known segment: ZETA_GAMMA_6. Next segment requires Alpha (1st) and Delta (4th) characters, and the next number (7).",
                hintText: "HINT: Form the code using first letter of Greek names, separated by underscores. What's the sequence?",
                onEnter: function () { UIManager.appendToTerminal(`\nSYSTEM: ACCESSING ${this.name}...`); UIManager.appendToTerminal(this.description, 'room-content'); UIManager.appendToTerminal(`Puzzle: ${this.puzzleText}`, 'puzzle-hint'); UIManager.appendToTerminal(`Hint: ${this.hintText}`, 'puzzle-hint'); UIManager.updatePromptPrefix("WOPR_R2>"); UIManager.updateMapDisplay(document.getElementById('mapDisplay').textContent.replace("OFFLINE", "LEVEL 1 ACCESS"), true); }
            },
        };
        unlockedRooms.room1 = true; // Unlock the first room by default
    }

    function handleCommand(commandStr) {
        if (!isGameReady || (commandInputEl && commandInputEl.disabled)) return;

        const currentPromptText = promptPrefixEl ? promptPrefixEl.textContent : "W.O.P.R.>";
        UIManager.appendPromptToTerminal(currentPromptText, commandStr);

        const [command, ...args] = commandStr.toLowerCase().split(/\s+/);
        const argString = args.join(' ').toUpperCase(); // Keep original case for solutions if needed, or ensure solutions are also uppercase
        const currentRoomObj = currentRoomId ? rooms[currentRoomId] : null;

        switch (command) {
            case 'help':
                UIManager.appendToTerminal("Available commands:");
                UIManager.appendToTerminal("  HELP                - Show this help message.");
                UIManager.appendToTerminal("  LIST ROOMS          - Show available rooms and status.");
                UIManager.appendToTerminal("  GOTO <room_id>      - Navigate to a room (e.g., GOTO room1).");
                UIManager.appendToTerminal("  SOLVE <answer>      - Attempt to solve the current room's puzzle.");
                UIManager.appendToTerminal("  LOOK                - Describe the current room and puzzle.");
                UIManager.appendToTerminal("  WHOAMI              - Display user status.");
                UIManager.appendToTerminal("  CLEAR               - Clear terminal screen.");
                UIManager.appendToTerminal("  MAP                 - Toggle tactical map display.");
                break;
            case 'map':
                const mapEl = document.getElementById('mapDisplay');
                if (mapEl) {
                    const isHidden = window.getComputedStyle(mapEl).display === 'none';
                    UIManager.updateMapDisplay(mapEl.textContent, isHidden); // Toggle visibility
                    UIManager.appendToTerminal(`Tactical map ${isHidden ? 'displayed' : 'hidden'}.`);
                }
                break;
            case 'list':
                if (args[0] && args[0].toLowerCase() === 'rooms') {
                    UIManager.appendToTerminal("Available System Nodes (Rooms):");
                    for (const rId in rooms) {
                        if (rooms.hasOwnProperty(rId)) {
                            const room = rooms[rId];
                            let status = room.completed ? "[COMPLETED]" : (unlockedRooms[rId] ? "[UNLOCKED]" : "[LOCKED]");
                            UIManager.appendToTerminal(`  ${room.id}: ${room.name} ${status}`);
                        }
                    }
                } else {
                    UIManager.appendToTerminal("Unknown LIST command. Try 'LIST ROOMS'.", 'system-message');
                }
                break;
            case 'goto':
                const targetRoomId = args[0] ? args[0].toLowerCase() : null;
                if (targetRoomId && rooms[targetRoomId]) {
                    if (unlockedRooms[targetRoomId]) {
                        // If moving away from a room with an active puzzle, ensure it's closed
                        if (activePuzzleInstance && currentRoomId && targetRoomId !== currentRoomId) {
                            console.log(`[Main.js] Navigating away from room ${currentRoomId} with active puzzle. Closing puzzle.`);
                            handlePuzzleClose(); // Close current puzzle if open
                            activePuzzleInstance = null; // Or decide if it should persist but be hidden
                        }
                        currentRoomId = targetRoomId;
                        console.log(`[Main.js] Transitioning to room: ${currentRoomId}`);
                        if (rooms[currentRoomId] && typeof rooms[currentRoomId].onEnter === 'function') {
                            rooms[currentRoomId].onEnter();
                        } else {
                            console.error(`[Main.js] Room ${currentRoomId} or its onEnter method is not defined.`);
                            UIManager.appendToTerminal(`ERROR: Cannot enter room ${currentRoomId}. Configuration issue.`, 'error-message');
                        }
                    } else {
                        UIManager.appendToTerminal(`ACCESS DENIED: Room ${targetRoomId} is locked. Solve previous puzzles.`, 'error-message');
                    }
                } else {
                    UIManager.appendToTerminal(`Invalid room ID: '${targetRoomId}'. Type 'LIST ROOMS' to see available rooms.`, 'error-message');
                }
                break;
            case 'solve':
                if (!currentRoomObj) {
                    UIManager.appendToTerminal("No active room. Use GOTO to enter a room.", 'system-message');
                    break;
                }
                if (currentRoomObj.completed) {
                    UIManager.appendToTerminal(`Room ${currentRoomObj.name} already completed.`, 'system-message');
                    break;
                }
                const expectedTerminalSolution = puzzleTerminalSolutions[currentRoomId];
                if (argString === expectedTerminalSolution) { // Ensure argString and expected solution cases match
                    UIManager.appendToTerminal(`CORRECT! Terminal solution accepted for ${currentRoomObj.name}.`, 'success-message');
                    currentRoomObj.completed = true;

                    // Close active puzzle if it's still open (player might have solved it, got code, returned, then typed SOLVE)
                    if (activePuzzleInstance) {
                        handlePuzzleClose();
                    }

                    const roomIds = Object.keys(rooms);
                    const currentIndex = roomIds.indexOf(currentRoomId);
                    if (currentIndex + 1 < roomIds.length) {
                        const nextRoomId = roomIds[currentIndex + 1];
                        unlockedRooms[nextRoomId] = true;
                        UIManager.appendToTerminal(`ACCESS GRANTED: ${rooms[nextRoomId].name} is now unlocked. Use 'GOTO ${nextRoomId}'.`, 'success-message');
                    } else {
                        UIManager.appendToTerminal("ALL SYSTEMS BYPASSED. MAIN OBJECTIVE ACHIEVED.", 'success-message highlight');
                        gameWon();
                    }
                } else {
                    UIManager.appendToTerminal("INCORRECT SOLUTION SUBMITTED TO TERMINAL. ACCESS DENIED.", 'error-message');
                    if (Math.random() < 0.3) {
                        UIManager.appendToTerminal("W.O.P.R.: That is not the correct access protocol. Security measures engaged.", "error-message");
                    }
                }
                break;
            case 'look':
                if (currentRoomObj && typeof currentRoomObj.onEnter === 'function') {
                    currentRoomObj.onEnter();
                } else if (currentRoomObj) {
                    console.error(`[Main.js] Room ${currentRoomId} onEnter method is not defined for LOOK.`);
                    UIManager.appendToTerminal(currentRoomObj.description || "No further information available.", 'room-content');
                }
                else {
                    UIManager.appendToTerminal("You are in the main W.O.P.R. interface. Use 'GOTO <room_id>' to enter a system node.", 'system-message');
                    UIManager.appendToTerminal("Type 'HELP' for available commands.", 'system-message');
                }
                break;
            case 'whoami':
                UIManager.appendToTerminal("USER: UNKNOWN_ENTITY_734");
                UIManager.appendToTerminal("AFFILIATION: ROGUE_ELEMENT");
                UIManager.appendToTerminal("CURRENT LOCATION: " + (currentRoomObj ? currentRoomObj.name : "W.O.P.R. SYSTEM LOBBY"));
                UIManager.appendToTerminal("OBJECTIVE: PREVENT GLOBAL THERMONUCLEAR WAR.");
                break;
            case 'clear':
                UIManager.clearTerminal();
                UIManager.appendToTerminal("Terminal display cleared. Type 'HELP' for commands.", "system-message");
                break;
            default:
                UIManager.appendToTerminal(`COMMAND UNRECOGNIZED: '${commandStr}'. Type 'HELP'.`, 'error-message');
                if (Math.random() < 0.2) {
                    const responses = ["W.O.P.R.: Invalid directive.", "SYSTEM: Command parse error. Check syntax.", "ERROR: Unknown operation code.", "W.O.P.R.: That move is not strategically sound."];
                    UIManager.appendToTerminal(responses[Math.floor(Math.random() * responses.length)], "system-message");
                }
        }
        if (commandInputEl) commandInputEl.value = ''; // Clear input after every command
    }

    function gameWon() {
        clearInterval(countdownInterval);
        isGameReady = false;
        UIManager.disableTerminalInput();
        UIManager.clearTerminal();
        let winMessage = `
*****************************************************************
* ACCESS GRANTED: FINAL OVERRIDE ACHIEVED!                      *
*                                                               *
* W.O.P.R. SIMULATION TERMINATED.                               *
* GLOBAL THERMONUCLEAR WAR AVERTED.                             *
*                                                               *
* THE ONLY WINNING MOVE IS NOT TO PLAY.                         *
*                                                               *
* CONGRATULATIONS, YOU HAVE SAVED THE WORLD!                    *
*                                                               *
*                             -- Professor Falken               *
*****************************************************************
`;
        UIManager.typeTextToTerminal(winMessage, 75, () => {
            UIManager.updateCountdownDisplay('--', '--');
            UIManager.setCountdownColor("var(--monitor-text)");
            UIManager.updatePromptPrefix("GAME_OVER>");
        });
    }

    function gameOver(message) {
        clearInterval(countdownInterval);
        isGameReady = false;
        UIManager.disableTerminalInput();
        UIManager.clearTerminal();
        let failMessage = `
#################################################################
# FATAL SYSTEM ERROR: ${message.toUpperCase()}                  #
#                                                               #
# W.O.P.R. HAS COMPLETED ITS SIMULATION.                        #
# DEFCON 1.                                                     #
# LAUNCH CODES VALIDATED.                                       #
#                                                               #
# STRANGE GAME.                                                 #
# THE ONLY WINNING MOVE IS NOT TO PLAY.                         #
# ...YOU LOST.                                                  #
#################################################################
`;
        UIManager.typeTextToTerminal(failMessage, 75, () => {
            UIManager.updateCountdownDisplay('XX', 'XX');
            UIManager.setCountdownColor("var(--monitor-accent)");
            UIManager.updatePromptPrefix("SYSTEM_HALTED>");
        });
    }

    function initializeGame() {
        isGameReady = false;
        UIManager.enableTerminalInput();
        UIManager.clearTerminal();

        UIManager.typeTextToTerminal(
            "Establishing secure connection to W.O.P.R. network...\nWelcome, user. System ready.\nType 'HELP' for commands.\nType 'GOTO room1' to start simulation analysis.\n",
            25,
            () => {
                initializeRooms();
                startCountdown();
                currentRoomId = null;
                UIManager.updatePromptPrefix("W.O.P.R.>");
                UIManager.appendToTerminal("Type 'HELP' for a list of available commands.", "system-message");
                UIManager.appendToTerminal("Your objective: Navigate system nodes, analyze data, and prevent global catastrophe.", "system-message highlight");
                UIManager.appendToTerminal("First assignment: Access NODE_RM1. Command: GOTO room1", "system-message");
                isGameReady = true;
                UIManager.focusTerminalInput();
            }
        );
    }

    if (commandInputEl) {
        commandInputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !commandInputEl.disabled) {
                e.preventDefault();
                const commandValue = commandInputEl.value.trim();
                // commandInputEl.value = ''; // Clear input immediately before handling
                // Moved to end of handleCommand for better UX if command is slow
                if (commandValue) {
                    handleCommand(commandValue);
                } else { // If user just presses enter with no text
                    UIManager.appendPromptToTerminal(promptPrefixEl ? promptPrefixEl.textContent : "W.O.P.R.>", "");
                }
            }
        });
    }

    document.addEventListener('click', (e) => {
        const modalElement = document.getElementById('bayesianQuizModal'); // Or a more generic class for modals
        if (commandInputEl && !commandInputEl.disabled) {
            // Focus terminal if click is not inside an active modal
            // Use window.getComputedStyle for robustness
            if (!(modalElement && window.getComputedStyle(modalElement).display === 'block' && modalElement.contains(e.target))) {
                UIManager.focusTerminalInput();
            }
        }
    });

    runBootSequence();
});