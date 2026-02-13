document.addEventListener('DOMContentLoaded', () => {
    // --- 1. INITIALIZATION ---
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
    }

    // --- 2. DOM ELEMENTS ---
    const userInput = document.getElementById('userInput');
    const aiOutput = document.getElementById('aiOutput');
    
    // Buttons
    const newNoteBtn = document.getElementById('newNoteBtn');
    const processBtn = document.getElementById('processBtn');
    const visualizeBtn = document.getElementById('visualizeBtn');
    const saveNoteBtn = document.getElementById('saveNoteBtn'); 
    const copyBtn = document.getElementById('copyBtn');
    const pdfBtn = document.getElementById('pdfBtn');
    const focusBtn = document.getElementById('focusBtn'); 
    const exitFocusBtn = document.getElementById('exitFocusBtn'); 
    const focusSoundBtn = document.getElementById('focusSoundBtn'); // NEW

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

    // Login Elements
    const loginScreen = document.getElementById('loginScreen');
    const loginBtn = document.getElementById('loginSubmitBtn');
    const appContainer = document.getElementById('appContainer');
    const loginUser = document.getElementById('loginUser');
    const loginPass = document.getElementById('loginPass');
    const loginError = document.getElementById('loginError');

    // Settings Elements
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const settingUser = document.getElementById('settingUser');
    const settingPass = document.getElementById('settingPass');
    const settingPrompt = document.getElementById('settingPrompt');

    let currentRawResponse = ""; 

    // --- 3. CREDENTIALS & LOGIN LOGIC ---
    let savedUser = localStorage.getItem('appUser') || 'admin';
    let savedPass = localStorage.getItem('appPass') || '1234';
    let savedPrompt = localStorage.getItem('appPrompt') || 'You are an expert AI tutor. Please summarize and format the response beautifully in Markdown.';

    if(loginBtn) {
        loginBtn.addEventListener('click', () => {
            const user = loginUser.value.trim();
            const pass = loginPass.value.trim();

            if(user === savedUser && pass === savedPass) {
                loginScreen.style.opacity = '0';
                setTimeout(() => {
                    loginScreen.style.display = 'none';
                    appContainer.classList.remove('hidden');
                }, 500);
            } else {
                loginError.classList.remove('hidden');
                loginBtn.style.animation = "shake 0.3s ease";
                setTimeout(() => loginBtn.style.animation = "", 300);
            }
        });
    }

    // --- 4. SETTINGS MODAL LOGIC ---
    if(settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingUser.value = savedUser;
            settingPass.value = savedPass;
            settingPrompt.value = savedPrompt;
            settingsModal.classList.remove('hidden');
            setTimeout(() => settingsModal.classList.add('show'), 10);
        });
    }

    if(closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('show');
            setTimeout(() => settingsModal.classList.add('hidden'), 200);
        });
    }

    if(saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            localStorage.setItem('appUser', settingUser.value.trim() || 'admin');
            localStorage.setItem('appPass', settingPass.value.trim() || '1234');
            localStorage.setItem('appPrompt', settingPrompt.value.trim());

            savedUser = localStorage.getItem('appUser');
            savedPass = localStorage.getItem('appPass');
            savedPrompt = localStorage.getItem('appPrompt');

            showToast("Preferences Saved!");
            closeSettingsBtn.click();
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
        if(theme.id !== 'nebula') {
            document.documentElement.setAttribute('data-theme', theme.id);
        }
        const btn = document.getElementById("themeBtn");
        if(btn) btn.title = `Current: ${theme.name}`;
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
    loadList('notesHistory', historyList);
    loadList('savedNotes', savedList);

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
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Clear all history?')) {
                localStorage.removeItem('notesHistory');
                loadList('notesHistory', historyList);
                if (historyList) { historyList.style.display = 'none'; historyToggle.classList.remove('active'); }
                showToast('History Cleared');
            }
        });
    }

    if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', () => {
            const content = currentRawResponse || aiOutput.innerText;
            let title = userInput.value.trim().substring(0, 25) || "Untitled Note";
            if (!content || content.includes("Ready for refinement") || content.trim().length === 0) {
                showToast("Generate a note first!"); return;
            }
            saveToList('savedNotes', title, content);
            loadList('savedNotes', savedList);
            if (savedList.style.display === 'none') {
                savedList.style.display = 'flex';
                savedToggle.classList.add('active');
                if (historyList) { historyList.style.display = 'none'; historyToggle.classList.remove('active'); }
            }
            showToast("Note Saved");
        });
    }

    // --- 7. CORE AI ENGINE ---
    processBtn.addEventListener('click', async () => {
        const text = userInput.value.trim();
        if (!text) { showToast("Enter notes first"); return; }
        
        processBtn.disabled = true; 
        processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Thinking...';
        
        try {
            const response = await fetch("http://127.0.0.1:8000/generate", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    prompt: text,
                    system_prompt: savedPrompt // Uses custom prompt from settings
                }),
            });

            if (!response.ok) throw new Error("Backend Error");
            const data = await response.json();
            
            currentRawResponse = data.response; 
            aiOutput.innerHTML = marked.parse(data.response);
            
            if (window.renderMathInElement) {
                renderMathInElement(aiOutput, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}] });
            }
            
            aiOutput.classList.remove('empty-state');
            enableLiveCode(); // New function for Insta-Code
            saveToList('notesHistory', text, data.response);
            loadList('notesHistory', historyList);
            showToast("Refinement Complete");

        } catch (error) { showToast("Error: " + error.message); } 
        finally { processBtn.disabled = false; processBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Refine'; }
    });

    // --- 8. AUDIO & VOICES (CURATED + TRUMP HACK) ---
    let voices = [];
    let speech = new SpeechSynthesisUtterance(); 
    let speeds = [1, 1.5, 2]; 
    let speedIndex = 0;

    function populateVoices() {
        const allVoices = window.speechSynthesis.getVoices();
        if(!voiceSelect) return;
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

        if(addedCount === 0) {
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
            if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) { 
                window.speechSynthesis.pause(); 
                playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; 
            } 
            else if (window.speechSynthesis.paused) { 
                window.speechSynthesis.resume(); 
                playAudioBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; 
            } 
            else {
                let t = window.getSelection().toString() || aiOutput.innerText || userInput.value;
                if (!t || t.includes("Ready")) return;
                
                window.speechSynthesis.cancel(); 
                speech.text = t; 
                
                if(voiceSelect) {
                    const selectedOption = voiceSelect.options[voiceSelect.selectedIndex];
                    const selectedName = selectedOption.value;
                    const customPitch = parseFloat(selectedOption.dataset.pitch) || 1;
                    const customRateMod = parseFloat(selectedOption.dataset.rateMod) || 1;

                    const allVoices = window.speechSynthesis.getVoices();
                    const chosenVoice = allVoices.find(v => v.name === selectedName);
                    
                    if(chosenVoice) {
                        speech.voice = chosenVoice;
                        speech.pitch = customPitch;
                        speech.rate = speeds[speedIndex] * customRateMod;
                    }
                }
                window.speechSynthesis.speak(speech); 
                playAudioBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            }
        });
    }

    if (stopAudioBtn) { stopAudioBtn.addEventListener('click', () => { window.speechSynthesis.cancel(); playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; }); }
    if (speedBtn) { speedBtn.addEventListener('click', () => { speedIndex = (speedIndex + 1) % speeds.length; speedBtn.innerText = speeds[speedIndex] + 'x'; }); }
    speech.onend = () => playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>';

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
                if(noiseSource) noiseSource.stop();
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
        if(code) code.style.whiteSpace = "pre-wrap";

        const actions = clone.querySelector('.code-actions');
        if(actions) actions.style.display = 'none';

        clone.style.position = "fixed"; clone.style.top = "-9999px"; clone.style.left = "-9999px";
        document.body.appendChild(clone);

        if(typeof html2canvas !== 'undefined') {
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
        if(oldOut && oldOut.classList.contains('code-output')) oldOut.remove();

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
            if (!text || text.length < 5) { showToast("Enter more text"); return; }
            visualizeBtn.disabled = true;
            const originalIcon = visualizeBtn.innerHTML;
            visualizeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            showToast("Designing...");
            const prompt = "Based on text, generate MERMAID.JS graph code. STRICT: Output ONLY code inside ```mermaid ... ```. Text: " + text.substring(0, 1500); 
            try {
                const response = await fetch("http://127.0.0.1:8000/generate", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: prompt, temperature: 0.2 }), 
                });
                const data = await response.json();
                const match = data.response.match(/```mermaid([\s\S]*?)```/);
                const mermaidCode = match ? match[1].trim() : data.response;
                aiOutput.innerHTML = "<div class='mermaid'>" + mermaidCode + "</div>";
                aiOutput.classList.remove('empty-state');
                await mermaid.run({ nodes: [aiOutput.querySelector('.mermaid')] });
                showToast("Diagram Created");
            } catch (error) { showToast("Visualization Failed"); } 
            finally { visualizeBtn.disabled = false; visualizeBtn.innerHTML = originalIcon; }
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
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); toggleGodMode(); }
        if (e.key === 'Escape' && cmdPalette) toggleGodMode();
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
        let history = (JSON.parse(localStorage.getItem('notesHistory')) || []).map(h => ({
            title: h.title, icon: "fa-clock-rotate-left", tag: "History",
            action: () => { userInput.value = h.o; aiOutput.innerHTML = marked.parse(h.r); aiOutput.classList.remove('empty-state'); currentRawResponse = h.r; enableLiveCode(); }
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

    focusBtn.addEventListener('click', () => { sidebar.classList.add('hidden'); topHeader.classList.add('hidden'); outputPanel.classList.add('hidden'); workspace.classList.add('zen'); exitFocusBtn.classList.add('show'); });
    exitFocusBtn.addEventListener('click', () => { sidebar.classList.remove('hidden'); topHeader.classList.remove('hidden'); outputPanel.classList.remove('hidden'); workspace.classList.remove('zen'); exitFocusBtn.classList.remove('show'); });
    newNoteBtn.addEventListener('click', () => { userInput.value = ''; aiOutput.innerHTML = '<i class="fa-solid fa-layer-group"></i><p>Ready</p>'; aiOutput.classList.add('empty-state'); currentRawResponse = ""; });
    userInput.addEventListener('input', (e) => { document.getElementById('inputStats').innerText = e.target.value.trim().split(/\s+/).length + ' words'; });
    function showToast(msg) { toast.innerText = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2000); }
    function saveToList(key, title, content) { let list = JSON.parse(localStorage.getItem(key)) || []; list.unshift({ id: Date.now(), title: title.substring(0, 25) + "...", o: "", r: content }); localStorage.setItem(key, JSON.stringify(list.slice(0, 20))); }
    function loadList(key, container) {
        if (!container) return; let list = JSON.parse(localStorage.getItem(key)) || []; container.innerHTML = '';
        list.forEach(item => {
            let el = document.createElement('div'); el.className = 'list-item'; el.innerText = item.title;
            el.onclick = () => { if (item.o) userInput.value = item.o; aiOutput.innerHTML = marked.parse(item.r); aiOutput.classList.remove('empty-state'); currentRawResponse = item.r; enableLiveCode(); if (window.innerWidth < 800) sidebar.classList.add('hidden'); };
            container.appendChild(el);
        });
    }
});