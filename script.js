document.addEventListener('DOMContentLoaded', () => {
    window.speechSynthesis.cancel();

    // --- 1. INITIALIZATION ---
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
    }

    // --- 2. DOM ELEMENTS ---
    const userInput = document.getElementById('userInput');
    const aiOutput = document.getElementById('aiOutput');
    const loginToggle = document.getElementById('toggleAuthMode');
    const rememberMe = document.getElementById('rememberMe');
    const confirmPass = document.getElementById('confirmPass');
    const logoutBtn = document.getElementById('logoutBtn');



    // Buttons
    const newNoteBtn = document.getElementById('newNoteBtn');
    const processBtn = document.getElementById('processBtn');
    const visualizeBtn = document.getElementById('visualizeBtn');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const copyBtn = document.getElementById('copyBtn');
    const pdfBtn = document.getElementById('pdfBtn');
    const focusBtn = document.getElementById('focusBtn');
    const exitFocusBtn = document.getElementById('exitFocusBtn');
    const focusSoundBtn = document.getElementById('focusSoundBtn');

    // Audio Elements
    const playAudioBtn = document.getElementById('playAudioBtn');
    const stopAudioBtn = document.getElementById('stopAudioBtn');
    const speedBtn = document.getElementById('speedBtn');
    const micBtn = document.getElementById('micBtn');
    const voiceSelect = document.getElementById('voiceSelect');

    // Sidebar & Lists
    const historyToggle = document.getElementById('historyToggle');
    const historyList = document.getElementById('historyList');
    const savedToggle = document.getElementById('savedToggle');
    const savedList = document.getElementById('savedList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    const sidebar = document.getElementById('sidebar');
    const topHeader = document.getElementById('topHeader');
    const outputPanel = document.getElementById('outputPanel');
    const workspace = document.getElementById('workspace');

    // God Mode
    const cmdPalette = document.getElementById('cmdPalette');
    const cmdInput = document.getElementById('cmdInput');
    const cmdResults = document.getElementById('cmdResults');
    const toast = document.getElementById('toast');

    // --- LOGIN ELEMENTS (MUST BE DECLARED BEFORE USE) ---
    const loginScreen = document.getElementById('loginScreen');
    const loginBtn = document.getElementById('loginSubmitBtn');
    const appContainer = document.getElementById('appContainer');
    const loginUser = document.getElementById('loginUser');
    const loginPass = document.getElementById('loginPass');
    const loginError = document.getElementById('loginError');

    // --- SETTINGS ELEMENTS ---
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const settingPrompt = document.getElementById('settingPrompt');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');

    function forceLogout(message = "Session expired. Please login again.") {
        localStorage.removeItem("access_token");
        sessionStorage.removeItem("access_token");

        appContainer.classList.add('hidden');
        loginScreen.style.display = 'flex';

        userInput.value = "";
        aiOutput.innerHTML = '<i class="fa-solid fa-sparkles"></i><p>Ready for refinement</p>';
        aiOutput.classList.add('empty-state');

        lastGeneratedNoteId = null;
        currentRawResponse = "";

        showToast(message);
    }


    // --- GLOBAL API FETCH WRAPPER ---
    async function apiFetch(url, options = {}) {
        const token =
            localStorage.getItem("access_token") ||
            sessionStorage.getItem("access_token");

        const headers = {
            ...(options.headers || {})
        };

        if (token) {
            headers["Authorization"] = "Bearer " + token;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        // GLOBAL 401 HANDLING
        if (response.status === 401) {
            forceLogout();
            throw new Error("Unauthorized");
        }


        return response;
    }


    async function validateSession() {
        const token =
            localStorage.getItem("access_token") ||
            sessionStorage.getItem("access_token");

        if (!token) {
            forceLogout("Please login to continue");
            return;
        }

        try {
            const response = await apiFetch("http://127.0.0.1:8000/me", {
                method: "GET"
            });

            if (!response.ok) {
                throw new Error();
            }

            const userData = await response.json();
            const email = userData.email;
            const username = email.split("@")[0];

            updateUserCard(username);

            loginScreen.style.display = 'none';
            appContainer.classList.remove('hidden');

            await loadNotesFromBackend();   // 🔥 ADD THIS

        } catch {
            forceLogout();
        }
    }


    async function loadNotesFromBackend() {
        try {
            const response = await apiFetch("http://127.0.0.1:8000/notes");

            if (!response.ok) {
                throw new Error("Failed to fetch notes");
            }

            const notes = await response.json();

            historyNotes = notes.filter(n => !n.is_bookmarked);
            historyDisplayCount = 10;
            savedNotesData = notes.filter(n => n.is_bookmarked);

            renderHistory();
            renderSaved();

        } catch (error) {
            console.error("Error loading notes:", error);
        }
    }

    function renderHistory() {
        historyList.innerHTML = "";

        const visibleNotes = historyNotes.slice(0, historyDisplayCount);

        visibleNotes.forEach(note => {

            const wrapper = document.createElement("div");
            wrapper.className = "list-item";

            const title = document.createElement("span");
            title.textContent = note.title || note.content.substring(0, 25);
            title.style.cursor = "pointer";

            title.onclick = () => {
                userInput.value = note.title || "";
                aiOutput.innerHTML = marked.parse(note.content);
                aiOutput.classList.remove("empty-state");

                currentRawResponse = note.content;
                lastGeneratedNoteId = note.id;

                enableLiveCode();
            };

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-btn hover-action";
            deleteBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
            deleteBtn.style.background = "transparent";
            deleteBtn.style.border = "none";
            deleteBtn.style.color = "#ef4444";
            deleteBtn.style.cursor = "pointer";

            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                showDeleteModal(note.id);
            };

            wrapper.appendChild(title);
            wrapper.appendChild(deleteBtn);

            historyList.appendChild(wrapper);
        });

        // Show More button
        if (historyNotes.length > historyDisplayCount) {
            const showMore = document.createElement("div");
            showMore.className = "list-item";
            showMore.style.textAlign = "center";
            showMore.style.fontWeight = "600";
            showMore.style.color = "var(--primary)";
            showMore.textContent = "Show More";

            showMore.onclick = () => {
                historyDisplayCount += 10;
                renderHistory();
            };

            historyList.appendChild(showMore);
        }
    }



    function renderSaved() {
        savedList.innerHTML = "";

        savedNotesData.forEach(note => {

            const wrapper = document.createElement("div");
            wrapper.className = "list-item";
            wrapper.style.display = "flex";
            wrapper.style.justifyContent = "space-between";
            wrapper.style.alignItems = "center";

            const title = document.createElement("span");
            title.textContent = note.title || note.content.substring(0, 25);
            title.style.cursor = "pointer";

            title.onclick = () => {
                userInput.value = note.title || "";
                aiOutput.innerHTML = marked.parse(note.content);
                aiOutput.classList.remove("empty-state");

                currentRawResponse = note.content;
                lastGeneratedNoteId = note.id;

                enableLiveCode();
            };

            const unbookmarkBtn = document.createElement("button");
            unbookmarkBtn.className = "hover-action";
            unbookmarkBtn.innerHTML = `<i class="fa-solid fa-bookmark"></i>`;
            unbookmarkBtn.style.background = "transparent";
            unbookmarkBtn.style.border = "none";
            unbookmarkBtn.style.color = "#818cf8";
            unbookmarkBtn.style.cursor = "pointer";

            unbookmarkBtn.onclick = async (e) => {
                e.stopPropagation();

                try {
                    const response = await apiFetch(
                        `http://127.0.0.1:8000/notes/${note.id}/bookmark`,
                        { method: "PATCH" }
                    );

                    if (!response.ok) throw new Error();

                    await loadNotesFromBackend();
                    showToast("Removed from saved");

                } catch {
                    showToast("Error updating bookmark");
                }
            };

            wrapper.appendChild(title);
            wrapper.appendChild(unbookmarkBtn);

            savedList.appendChild(wrapper);
        });
    }




    let currentRawResponse = "";
    let historyNotes = [];
    let historyDisplayCount = 10;
    let savedNotesData = [];
    let lastGeneratedNoteId = null;

    let savedPrompt = localStorage.getItem('appPrompt') ||
        'You are an expert AI tutor. Summarize clearly using clean Markdown.';


    // --- 3. AUTH LOGIC ---

    let isRegisterMode = false;

    if (loginToggle) {
        loginToggle.addEventListener('click', () => {
            isRegisterMode = !isRegisterMode;
            const confirmGroup = document.getElementById('confirmPasswordGroup');

            if (isRegisterMode) {
                confirmGroup.classList.remove('hidden');
            } else {
                confirmGroup.classList.add('hidden');
            }


            if (isRegisterMode) {
                loginBtn.innerHTML = 'Create Account <i class="fa-solid fa-user-plus"></i>';
                loginToggle.innerText = "Already have an account? Login";
            } else {
                loginBtn.innerHTML = 'Enter Workspace <i class="fa-solid fa-arrow-right"></i>';
                loginToggle.innerText = "Don't have an account? Register";
            }

            loginError.classList.add('hidden');
        });
    }

    // --- LOGOUT LOGIC ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            forceLogout("Logged out successfully");
        });

    }


    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {

            const email = loginUser.value.trim();
            const password = loginPass.value.trim();

            if (!email || !password) {
                loginError.textContent = "Please enter email and password";
                loginError.classList.remove('hidden');
                return;
            }


            if (isRegisterMode) {
                if (!confirmPass.value.trim()) {
                    loginError.textContent = "Please confirm your password";
                    loginError.classList.remove('hidden');
                    return;
                }

                if (password !== confirmPass.value.trim()) {
                    loginError.textContent = "Passwords do not match";
                    loginError.classList.remove('hidden');
                    return;
                }
            }


            try {

                if (isRegisterMode) {
                    // REGISTER
                    const response = await fetch("http://127.0.0.1:8000/register", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            email: email,
                            password: password
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.detail || "Registration failed");
                    }


                    showToast("Account created. Please login.");
                    isRegisterMode = false;
                    loginBtn.innerHTML = 'Enter Workspace <i class="fa-solid fa-arrow-right"></i>';
                    loginToggle.innerText = "Don't have an account? Register";
                    return;
                }

                // LOGIN
                const formData = new URLSearchParams();
                formData.append("username", email);
                formData.append("password", password);

                const response = await fetch("http://127.0.0.1:8000/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "Invalid credentials");
                }


                const data = await response.json();

                if (rememberMe && rememberMe.checked) {
                    localStorage.setItem("access_token", data.access_token);
                } else {
                    sessionStorage.setItem("access_token", data.access_token);
                }

                loginScreen.style.display = 'none';
                appContainer.classList.remove('hidden');
                await loadNotesFromBackend();


            } catch (error) {
                loginError.textContent = error.message;
                loginError.classList.remove('hidden');
            }
        });
    }



    // --- 4. SETTINGS MODAL LOGIC ---
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingPrompt.value = savedPrompt;
            settingsModal.classList.remove('hidden');
            setTimeout(() => settingsModal.classList.add('show'), 10);
        });
    }


    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('show');
            setTimeout(() => settingsModal.classList.add('hidden'), 200);
        });
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            localStorage.setItem('appPrompt', settingPrompt.value.trim());
            savedPrompt = localStorage.getItem('appPrompt');
            showToast("Preferences Saved!");
            closeSettingsBtn.click();
        });
    }

    // --- CHANGE PASSWORD LOGIC ---
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', async () => {

            const currentPassword = currentPasswordInput.value.trim();
            const newPassword = newPasswordInput.value.trim();
            const confirmPassword = confirmNewPasswordInput.value.trim();

            if (!currentPassword || !newPassword || !confirmPassword) {
                showToast("Please fill all password fields");
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast("New passwords do not match");
                return;
            }

            try {
                const response = await apiFetch("http://127.0.0.1:8000/change-password", {
                    method: "POST",
                    body: JSON.stringify({
                        old_password: currentPassword,
                        new_password: newPassword
                    })
                });

                if (!response.ok) {
                    throw new Error("Incorrect current password");
                }

                showToast("Password updated successfully");

                currentPasswordInput.value = "";
                newPasswordInput.value = "";
                confirmNewPasswordInput.value = "";

            } catch (error) {
                showToast(error.message);
            }

        });
    }



    // --- 5. THEME LOGIC ---
    const themes = [
        { id: 'nebula', icon: 'fa-moon', name: 'Nebula' },
        { id: 'light', icon: 'fa-sun', name: 'Daylight' },
        { id: 'midnight', icon: 'fa-battery-quarter', name: 'Midnight' },
        { id: 'terminal', icon: 'fa-terminal', name: 'Hacker' },
        { id: 'sunset', icon: 'fa-fire', name: 'Sunset' }
    ];

    let currentThemeIndex = parseInt(localStorage.getItem('themeIndex')) || 0;

    function applyTheme(index) {
        const theme = themes[index];
        document.documentElement.removeAttribute('data-theme');
        if (theme.id !== 'nebula') {
            document.documentElement.setAttribute('data-theme', theme.id);
        }
        const btn = document.getElementById("themeBtn");
        if (btn) btn.title = `Current: ${theme.name}`;
        localStorage.setItem('themeIndex', index);
    }
    applyTheme(currentThemeIndex);

    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', () => {
            const idx = parseInt(option.getAttribute('data-idx'));
            applyTheme(idx);
            showToast(`Theme: ${themes[idx].name}`);
        });
    });

    // --- 6. DATA & SIDEBAR ---

    if (historyToggle) {
        historyToggle.addEventListener('click', () => {
            const isHidden = historyList.style.display === 'none';
            historyList.style.display = isHidden ? 'flex' : 'none';
            historyToggle.classList.toggle('active', isHidden);
            if (isHidden && savedList) { savedList.style.display = 'none'; savedToggle.classList.remove('active'); }
        });
    }

    if (savedToggle) {
        savedToggle.addEventListener('click', () => {
            const isHidden = savedList.style.display === 'none';
            savedList.style.display = isHidden ? 'flex' : 'none';
            savedToggle.classList.toggle('active', isHidden);
            if (isHidden && historyList) { historyList.style.display = 'none'; historyToggle.classList.remove('active'); }
        });
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener("click", async () => {
            if (!confirm("Clear all history notes?")) return;

            try {
                for (const note of historyNotes) {
                    await apiFetch(
                        `http://127.0.0.1:8000/notes/${note.id}`,
                        { method: "DELETE" }
                    );
                }

                await loadNotesFromBackend();
                showToast("History cleared");

            } catch (error) {
                showToast("Error clearing history");
            }
        });
    }


    if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', async () => {

            if (!lastGeneratedNoteId) {
                showToast("No note selected to bookmark");
                return;
            }

            try {
                const response = await apiFetch(
                    `http://127.0.0.1:8000/notes/${lastGeneratedNoteId}/bookmark`,
                    { method: "PATCH" }
                );

                if (!response.ok) {
                    throw new Error("Bookmark failed");
                }

                await loadNotesFromBackend();
                showToast("Bookmark updated");

            } catch (error) {
                showToast("Bookmark failed");
            }
        });
    }



    // --- 7. CORE AI ENGINE ---
    processBtn.addEventListener('click', async () => {
        const text = userInput.value.trim();
        if (!text) { showToast("Enter notes first"); return; }

        processBtn.disabled = true;
        processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Thinking...';

        try {
            const response = await apiFetch("http://127.0.0.1:8000/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    prompt: text
                }),
            });


            if (!response.ok) {
                throw new Error("Backend Error");
            }
            const data = await response.json();

            currentRawResponse = data.response;
            aiOutput.innerHTML = marked.parse(data.response);

            if (window.renderMathInElement) {
                renderMathInElement(aiOutput, { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }] });
            }

            aiOutput.classList.remove('empty-state');
            enableLiveCode(); // New function for Insta-Code
            lastGeneratedNoteId = data.note_id;
            await loadNotesFromBackend();
            showToast("Refinement Complete");

        } catch (error) { showToast("Error: " + error.message); }
        finally { processBtn.disabled = false; processBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Refine'; }
    });

    // --- 8. AUDIO & VOICES (CURATED + TRUMP HACK) ---
    let voices = [];
    let speeds = [1, 1.5, 2];
    let speedIndex = 0;
    let currentUtterance = null;


    function populateVoices() {
        const allVoices = window.speechSynthesis.getVoices();

        if (!allVoices || allVoices.length === 0) {
            setTimeout(populateVoices, 200);
            return;
        }

        if (!voiceSelect) return;
        voiceSelect.innerHTML = '';

        const preferredAccents = [
            { id: 'trump-hack', name: '🎙️ Donald Trump (Impression)', keywords: ['Google US English', 'David', 'Alex'], pitch: 0.6, rateMod: 0.85 },
            { id: 'us-female', name: '🇺🇸 US Female', keywords: ['Google US English Female', 'Zira', 'Samantha'], pitch: 1, rateMod: 1 },
            { id: 'us-male', name: '🇺🇸 US Male', keywords: ['Google US English Male', 'David', 'Alex'], pitch: 1, rateMod: 1 },
            { id: 'uk-female', name: '🇬🇧 UK Female', keywords: ['Google UK English Female', 'Susan', 'Hazel'], pitch: 1, rateMod: 1 },
            { id: 'uk-male', name: '🇬🇧 UK Male', keywords: ['Google UK English Male', 'George', 'Daniel'], pitch: 1, rateMod: 1 },
            { id: 'aus', name: '🇦🇺 Australian', keywords: ['Google Australian', 'Karen', 'Catherine'], pitch: 1, rateMod: 1 },
            { id: 'ind', name: '🇮🇳 Indian', keywords: ['Google हिन्दी', 'Rishi', 'Veena', 'Indian'], pitch: 1, rateMod: 1 }
        ];

        let addedCount = 0;
        preferredAccents.forEach(accent => {
            const match = allVoices.find(v => accent.keywords.some(k => v.name.includes(k)));
            if (match) {
                const option = document.createElement('option');
                option.textContent = accent.name;
                option.value = match.name;
                option.dataset.pitch = accent.pitch;
                option.dataset.rateMod = accent.rateMod;
                voiceSelect.appendChild(option);
                addedCount++;
            }
        });

        if (addedCount === 0) {
            allVoices.filter(v => v.lang.includes('en')).slice(0, 5).forEach(v => {
                const option = document.createElement('option');
                option.textContent = v.name.substring(0, 25);
                option.value = v.name;
                option.dataset.pitch = 1;
                option.dataset.rateMod = 1;
                voiceSelect.appendChild(option);
            });
        }
    }

    populateVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoices;
    }

    if (playAudioBtn) {
        playAudioBtn.addEventListener('click', () => {

            // If paused → resume FIRST
            if (speechSynthesis.paused) {
                speechSynthesis.resume();
                playAudioBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                return;
            }

            // If currently speaking → pause
            if (speechSynthesis.speaking) {
                speechSynthesis.pause();
                playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                return;
            }

            // Otherwise → start fresh
            const text = window.getSelection().toString() || aiOutput.innerText || userInput.value;
            if (!text || text.includes("Ready")) return;

            speechSynthesis.cancel();

            currentUtterance = new SpeechSynthesisUtterance(text);

            if (voiceSelect && voiceSelect.options.length > 0) {
                const selectedOption = voiceSelect.options[voiceSelect.selectedIndex];
                const selectedName = selectedOption.value;
                const customPitch = parseFloat(selectedOption.dataset.pitch) || 1;
                const customRateMod = parseFloat(selectedOption.dataset.rateMod) || 1;

                const voices = speechSynthesis.getVoices();
                const chosenVoice = voices.find(v => v.name === selectedName);

                if (chosenVoice) {
                    currentUtterance.voice = chosenVoice;
                    currentUtterance.pitch = customPitch;
                    currentUtterance.rate = speeds[speedIndex] * customRateMod;
                }
            }

            currentUtterance.onend = () => {
                playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                currentUtterance = null;
            };

            speechSynthesis.speak(currentUtterance);
            playAudioBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        });
    }


    if (stopAudioBtn) {
        stopAudioBtn.addEventListener('click', () => {
            speechSynthesis.cancel();
            currentUtterance = null;
            playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        });
    }

    if (speedBtn) { speedBtn.addEventListener('click', () => { speedIndex = (speedIndex + 1) % speeds.length; speedBtn.innerText = speeds[speedIndex] + 'x'; }); }

    // --- 9. DEEP FOCUS NOISE (BROWN NOISE) ---
    let audioCtx;
    let noiseSource;
    let isNoisePlaying = false;

    if (focusSoundBtn) {
        focusSoundBtn.addEventListener('click', () => {
            if (!isNoisePlaying) {
                if (!audioCtx) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    audioCtx = new AudioContext();
                }
                const bufferSize = audioCtx.sampleRate * 2;
                const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = buffer.getChannelData(0);

                let lastOut = 0;
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    const brown = (lastOut + (0.02 * white)) / 1.02;
                    data[i] = brown * 3.5;
                    lastOut = brown;
                }

                noiseSource = audioCtx.createBufferSource();
                noiseSource.buffer = buffer;
                noiseSource.loop = true;
                const noiseGain = audioCtx.createGain();
                noiseGain.gain.value = 0.05;

                noiseSource.connect(noiseGain);
                noiseGain.connect(audioCtx.destination);
                noiseSource.start();
                isNoisePlaying = true;

                focusSoundBtn.classList.add('active');
                focusSoundBtn.style.color = "var(--primary)";
                focusSoundBtn.style.borderColor = "var(--primary)";
                focusSoundBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                showToast("Deep Focus: ON");
            } else {
                if (noiseSource) noiseSource.stop();
                isNoisePlaying = false;
                focusSoundBtn.classList.remove('active');
                focusSoundBtn.style.color = "";
                focusSoundBtn.style.borderColor = "";
                focusSoundBtn.innerHTML = '<i class="fa-solid fa-wave-square"></i>';
                showToast("Deep Focus: OFF");
            }
        });
    }

    // --- 10. INSTA-CODE SNAPSHOTS & RUN ---
    function enableLiveCode() {
        const codes = aiOutput.querySelectorAll('pre code');
        codes.forEach(block => {
            const pre = block.parentElement;
            if (pre.classList.contains('processed')) return;
            pre.classList.add('processed');
            pre.style.position = 'relative';

            const header = document.createElement('div');
            header.className = 'code-header';

            const dots = document.createElement('div');
            dots.className = 'window-dots';
            dots.innerHTML = '<span></span><span></span><span></span>';
            header.appendChild(dots);

            const actions = document.createElement('div');
            actions.className = 'code-actions';

            const copyBtn = document.createElement('button');
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
            copyBtn.title = "Copy Code";
            copyBtn.onclick = () => { navigator.clipboard.writeText(block.innerText); showToast("Code Copied!"); };

            const snapBtn = document.createElement('button');
            snapBtn.innerHTML = '<i class="fa-solid fa-camera"></i>';
            snapBtn.title = "Export Image";
            snapBtn.onclick = () => takeCodeSnapshot(pre);

            actions.appendChild(copyBtn);
            actions.appendChild(snapBtn);

            if (block.className.includes('javascript') || block.className.includes('js')) {
                const runBtn = document.createElement('button');
                runBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run';
                runBtn.className = 'run-btn-small';
                runBtn.onclick = () => executeCode(block, pre);
                actions.appendChild(runBtn);
            }

            header.appendChild(actions);
            pre.insertBefore(header, block);
        });
    }

    function takeCodeSnapshot(preElement) {
        showToast("Snapping Code...");
        const clone = preElement.cloneNode(true);
        clone.style.width = "800px";
        clone.style.padding = "40px";
        clone.style.background = "linear-gradient(135deg, #1e293b, #0f172a)";
        clone.style.borderRadius = "20px";
        clone.style.boxShadow = "0 20px 50px rgba(0,0,0,0.5)";

        const code = clone.querySelector('code');
        if (code) code.style.whiteSpace = "pre-wrap";

        const actions = clone.querySelector('.code-actions');
        if (actions) actions.style.display = 'none';

        clone.style.position = "fixed"; clone.style.top = "-9999px"; clone.style.left = "-9999px";
        document.body.appendChild(clone);

        if (typeof html2canvas !== 'undefined') {
            html2canvas(clone, { backgroundColor: null, scale: 2 }).then(canvas => {
                const link = document.createElement('a');
                link.download = 'edu-snippet-' + Date.now() + '.png';
                link.href = canvas.toDataURL();
                link.click();
                document.body.removeChild(clone);
                showToast("Snapshot Saved! 📸");
            });
        } else {
            alert("Snapshot library missing (html2canvas)");
        }
    }

    function executeCode(block, pre) {
        const oldOut = pre.nextElementSibling;
        if (oldOut && oldOut.classList.contains('code-output')) oldOut.remove();

        const outputDiv = document.createElement('div');
        outputDiv.className = 'code-output show';

        const logs = [];
        const oldLog = console.log;
        console.log = (...args) => logs.push(args.join(' '));

        try {
            eval(block.innerText);
            outputDiv.innerText = logs.length > 0 ? logs.join('\n') : "> Executed (No output)";
            outputDiv.style.color = "#10b981";
        }
        catch (err) {
            outputDiv.innerText = "Error: " + err.message;
            outputDiv.style.color = "#ef4444";
        }
        console.log = oldLog;
        pre.after(outputDiv);
    }
    async function showDeleteModal(noteId) {
        const confirmed = confirm("Are you sure you want to delete this note?");

        if (!confirmed) return;

        try {
            const response = await apiFetch(
                `http://127.0.0.1:8000/notes/${noteId}`,
                { method: "DELETE" }
            );

            if (!response.ok) {
                throw new Error("Delete failed");
            }

            await loadNotesFromBackend();
            showToast("Note deleted");

        } catch (error) {
            showToast("Error deleting note");
        }
    }

    // --- 11. EXTRAS (PDF, VISUALIZE, GOD MODE) ---
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            if (typeof html2pdf === 'undefined') { alert("PDF Library Missing"); return; }
            if (aiOutput.classList.contains('empty-state')) { showToast("Nothing to export"); return; }
            showToast("Generating PDF...");
            const originalIcon = pdfBtn.innerHTML;
            pdfBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            html2pdf().set({
                margin: 0.5, filename: 'EduSummarizer.pdf', image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            }).from(aiOutput).save().then(() => showToast("PDF Downloaded")).finally(() => pdfBtn.innerHTML = originalIcon);
        });
    }

    if (visualizeBtn) {
        visualizeBtn.addEventListener('click', async () => {
            const text = userInput.value.trim() || aiOutput.innerText;

            if (!text || text.length < 5) {
                showToast("Enter more text");
                return;
            }

            visualizeBtn.disabled = true;
            const originalIcon = visualizeBtn.innerHTML;
            visualizeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            showToast("Designing...");

            const prompt = "Based on text, generate MERMAID.JS graph code. STRICT: Output ONLY code inside ```mermaid ... ```. Text: " + text.substring(0, 1500);

            try {

                const response = await apiFetch("http://127.0.0.1:8000/generate", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        temperature: 0.2
                    }),
                });

                if (!response.ok) {
                    throw new Error("Backend Error");
                }

                const data = await response.json();

                const match = data.response.match(/```mermaid([\s\S]*?)```/);
                const mermaidCode = match ? match[1].trim() : data.response;

                aiOutput.innerHTML = "<div class='mermaid'>" + mermaidCode + "</div>";
                aiOutput.classList.remove('empty-state');

                await mermaid.run({ nodes: [aiOutput.querySelector('.mermaid')] });

                showToast("Diagram Created");

            } catch (error) {
                showToast("Visualization Failed");
            }

        });
    }


    // God Mode Logic
    function toggleGodMode() {
        if (!cmdPalette) return;
        const isHidden = cmdPalette.classList.contains('hidden');
        if (isHidden) {
            cmdPalette.classList.remove('hidden');
            setTimeout(() => cmdPalette.classList.add('show'), 10);
            cmdInput.value = ''; cmdInput.focus(); renderCommands('');
        } else {
            cmdPalette.classList.remove('show');
            setTimeout(() => cmdPalette.classList.add('hidden'), 200);
        }
    }
    document.addEventListener('keydown', (e) => {
        // Ctrl + K → God Mode
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            toggleGodMode();
        }

        if (e.key === "Escape" && settingsModal && settingsModal.classList.contains("show")) {
            closeSettingsBtn.click();
        }
    });

    if (cmdPalette) { cmdPalette.addEventListener('click', (e) => { if (e.target === cmdPalette) toggleGodMode(); }); }

    const actions = [
        { title: "New Note", icon: "fa-plus", tag: "Action", action: () => newNoteBtn.click() },
        { title: "Refine Text", icon: "fa-wand-magic-sparkles", tag: "AI", action: () => processBtn.click() },
        { title: "Save Note", icon: "fa-bookmark", tag: "Action", action: () => saveNoteBtn.click() },
        { title: "Export PDF", icon: "fa-file-pdf", tag: "File", action: () => pdfBtn ? pdfBtn.click() : null },
        { title: "Visualize", icon: "fa-diagram-project", tag: "Tool", action: () => visualizeBtn.click() },
        { title: "Focus Mode", icon: "fa-expand", tag: "View", action: () => focusBtn.click() },
        { title: "Settings", icon: "fa-gear", tag: "System", action: () => settingsBtn.click() },
        { title: "Clear Data", icon: "fa-trash", tag: "Data", action: () => { if (confirm("Clear All?")) { localStorage.clear(); location.reload(); } } },
        { title: "Theme: Nebula", icon: "fa-moon", tag: "Theme", action: () => applyTheme(0) },
        { title: "Theme: Daylight", icon: "fa-sun", tag: "Theme", action: () => applyTheme(1) },
        { title: "Theme: Hacker", icon: "fa-terminal", tag: "Theme", action: () => applyTheme(3) }
    ];

    if (cmdInput) {
        cmdInput.addEventListener('input', (e) => renderCommands(e.target.value));
        cmdInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { const selected = document.querySelector('.cmd-item'); if (selected) selected.click(); }
        });
    }

    function renderCommands(query) {
        if (!cmdResults) return; cmdResults.innerHTML = '';
        const q = query.toLowerCase();
        let history = historyNotes.map(note => ({
            title: note.title || note.content.substring(0, 25),
            icon: "fa-clock-rotate-left",
            tag: "History",
            action: () => {
                userInput.value = note.title || "";
                aiOutput.innerHTML = marked.parse(note.content);
                aiOutput.classList.remove('empty-state');
                currentRawResponse = note.content;
                lastGeneratedNoteId = note.id;
                enableLiveCode();
            }
        }));

        const filteredActions = actions.filter(item => item.title.toLowerCase().includes(q) && item.tag !== 'Theme');
        const filteredThemes = actions.filter(item => item.title.toLowerCase().includes(q) && item.tag === 'Theme');
        const filteredHistory = history.filter(item => item.title.toLowerCase().includes(q));

        const renderSection = (title, items) => {
            if (items.length === 0) return;
            const header = document.createElement('div'); header.className = 'cmd-category-title'; header.innerText = title; cmdResults.appendChild(header);
            items.forEach((item) => {
                const el = document.createElement('div'); el.className = 'cmd-item';
                el.innerHTML = `<div class='cmd-icon'><i class='fa-solid ${item.icon}'></i></div><div class='cmd-text'>${item.title}</div><div class='cmd-tag'>${item.tag}</div>`;
                el.onclick = () => { item.action(); toggleGodMode(); };
                cmdResults.appendChild(el);
            });
        };
        if (filteredActions.length + filteredThemes.length + filteredHistory.length === 0) {
            cmdResults.innerHTML = "<div style='padding:15px; color:#64748b; text-align:center;'>No actions found</div>"; return;
        }
        renderSection("Commands", filteredActions);
        renderSection("Themes", filteredThemes);
        renderSection("History", filteredHistory);
        const first = cmdResults.querySelector('.cmd-item'); if (first) first.classList.add('selected');
    }

    // Mic & Utils
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && micBtn) {
        let recognition = new SpeechRecognition();
        recognition.continuous = false; recognition.lang = 'en-US';
        micBtn.addEventListener('click', () => {
            if (micBtn.classList.contains('recording')) { recognition.stop(); }
            else { try { recognition.start(); micBtn.classList.add('recording'); showToast("Listening..."); } catch (e) { showToast("Mic Error"); } }
        });
        recognition.onresult = (event) => {
            userInput.value += (userInput.value.length > 0 ? ' ' : '') + event.results[0][0].transcript;
            userInput.dispatchEvent(new Event('input'));
        };
        recognition.onend = () => micBtn.classList.remove('recording');
    }

    focusBtn.addEventListener('click', () => {
        sidebar.classList.add('hidden');
        topHeader.classList.add('hidden');
        outputPanel.classList.add('hidden');
        workspace.classList.add('zen');

        exitFocusBtn.classList.remove('hidden');
        exitFocusBtn.classList.add('show');
    });
    exitFocusBtn.addEventListener('click', () => {
        sidebar.classList.remove('hidden');
        topHeader.classList.remove('hidden');
        outputPanel.classList.remove('hidden');
        workspace.classList.remove('zen');

        exitFocusBtn.classList.remove('show');
        exitFocusBtn.classList.add('hidden');
    });
    newNoteBtn.addEventListener('click', () => { userInput.value = ''; aiOutput.innerHTML = '<i class="fa-solid fa-layer-group"></i><p>Ready</p>'; aiOutput.classList.add('empty-state'); currentRawResponse = ""; });
    userInput.addEventListener('input', (e) => { document.getElementById('inputStats').innerText = e.target.value.trim().split(/\s+/).length + ' words'; });
    function showToast(msg) { toast.innerText = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2000); }
    function updateUserCard(username) {
        const nameElement = document.querySelector(".user-info .name");
        const avatarElement = document.querySelector(".user-avatar");

        if (nameElement) {
            nameElement.textContent = username;
        }

        if (avatarElement) {
            const initials = username.substring(0, 2).toUpperCase();
            avatarElement.textContent = initials;
        }
    }

    // Validate token on page load
    validateSession();
});