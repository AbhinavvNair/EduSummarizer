document.addEventListener('DOMContentLoaded', () => {
    // Initialize Mermaid (Charts)
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });

    // --- DOM ELEMENTS ---
    const userInput = document.getElementById('userInput');
    const aiOutput = document.getElementById('aiOutput');
    
    // Buttons
    const newNoteBtn = document.getElementById('newNoteBtn');
    const processBtn = document.getElementById('processBtn');
    const visualizeBtn = document.getElementById('visualizeBtn');
    const studyBtn = document.getElementById('studyBtn'); 
    const focusBtn = document.getElementById('focusBtn'); 
    const exitFocusBtn = document.getElementById('exitFocusBtn'); 
    const toast = document.getElementById('toast');
    
    // Audio / Voice
    const micBtn = document.getElementById('micBtn');
    const playAudioBtn = document.getElementById('playAudioBtn');
    const stopAudioBtn = document.getElementById('stopAudioBtn');
    const speedBtn = document.getElementById('speedBtn');
    
    // Layout
    const sidebar = document.getElementById('sidebar');
    const topHeader = document.getElementById('topHeader');
    const outputPanel = document.getElementById('outputPanel');
    const workspace = document.getElementById('workspace');
    
    // Storage Lists
    const historyList = document.getElementById('historyList');
    const savedList = document.getElementById('savedList');
    
    // Command Palette
    const cmdPalette = document.getElementById('cmdPalette');
    const cmdInput = document.getElementById('cmdInput');
    const cmdResults = document.getElementById('cmdResults');

    // --- INITIAL LOAD ---
    loadList('notesHistory', historyList);
    loadList('savedNotes', savedList);
    
    // Load Saved Theme
    const savedTheme = localStorage.getItem('userTheme');
    if(savedTheme) {
        const theme = JSON.parse(savedTheme);
        setTheme(theme.primary, theme.hover, false);
    }

    // ==========================================
    // 1. THEME ENGINE
    // ==========================================
    function setTheme(primary, hover, notify = true) {
        document.documentElement.style.setProperty('--primary', primary);
        document.documentElement.style.setProperty('--primary-hover', hover);
        localStorage.setItem('userTheme', JSON.stringify({ primary, hover }));
        if(notify) showToast("Theme Updated");
    }

    // ==========================================
    // 2. COMMAND PALETTE (GOD MODE)
    // ==========================================
    function togglePalette() {
        if(!cmdPalette) return;
        const isHidden = cmdPalette.classList.contains('hidden');
        if (isHidden) {
            cmdPalette.classList.remove('hidden');
            setTimeout(() => cmdPalette.classList.add('show'), 10);
            cmdInput.value = '';
            cmdInput.focus();
            renderCommands(''); 
        } else {
            cmdPalette.classList.remove('show');
            setTimeout(() => cmdPalette.classList.add('hidden'), 200);
        }
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault(); togglePalette();
        }
        if (e.key === 'Escape' && cmdPalette && !cmdPalette.classList.contains('hidden')) {
            togglePalette();
        }
    });

    if(cmdPalette) {
        cmdPalette.addEventListener('click', (e) => { if (e.target === cmdPalette) togglePalette(); });
    }

    // --- ACTION MEGA PACK ---
    const actions = [
        // Core Tools
        { title: "New Note", icon: "fa-plus", tag: "Action", action: () => newNoteBtn.click() },
        { title: "Focus Mode", icon: "fa-expand", tag: "View", action: () => focusBtn.click() },
        { title: "Podcast Play", icon: "fa-play", tag: "Audio", action: () => playAudioBtn.click() },
        { title: "Refine Text", icon: "fa-wand-magic-sparkles", tag: "AI", action: () => processBtn.click() },
        { title: "Visualize", icon: "fa-diagram-project", tag: "Tool", action: () => visualizeBtn.click() },
        { title: "Study Cards", icon: "fa-graduation-cap", tag: "Study", action: () => studyBtn.click() },
        
        // --- THEMES: Blues & Purples ---
        { title: "Theme: Default Blue", icon: "fa-droplet", tag: "Theme", action: () => setTheme('#818CF8', '#6366F1') },
        { title: "Theme: Electric Violet", icon: "fa-bolt", tag: "Theme", action: () => setTheme('#a78bfa', '#8b5cf6') },
        { title: "Theme: Deep Ocean", icon: "fa-water", tag: "Theme", action: () => setTheme('#38bdf8', '#0ea5e9') },
        
        // --- THEMES: Greens & Teals ---
        { title: "Theme: Hacker Green", icon: "fa-terminal", tag: "Theme", action: () => setTheme('#34d399', '#10b981') },
        { title: "Theme: Mint Fresh", icon: "fa-leaf", tag: "Theme", action: () => setTheme('#2dd4bf', '#14b8a6') },
        { title: "Theme: Toxic Lime", icon: "fa-biohazard", tag: "Theme", action: () => setTheme('#a3e635', '#84cc16') },
        
        // --- THEMES: Warm Colors ---
        { title: "Theme: Cyberpunk Pink", icon: "fa-backward", tag: "Theme", action: () => setTheme('#f472b6', '#ec4899') },
        { title: "Theme: Crimson Red", icon: "fa-fire", tag: "Theme", action: () => setTheme('#f87171', '#ef4444') },
        { title: "Theme: Sunset Orange", icon: "fa-sun", tag: "Theme", action: () => setTheme('#fb923c', '#f97316') },
        { title: "Theme: Royal Gold", icon: "fa-crown", tag: "Theme", action: () => setTheme('#fbbf24', '#f59e0b') },
        
        // --- THEMES: Monochrome ---
        { title: "Theme: Zen Gray", icon: "fa-mountain", tag: "Theme", action: () => setTheme('#94a3b8', '#64748b') },

        // Data Management
        { title: "Clear History", icon: "fa-trash", tag: "Data", action: () => { localStorage.removeItem('notesHistory'); location.reload(); } }
    ];

    if(cmdInput) {
        cmdInput.addEventListener('input', (e) => renderCommands(e.target.value));
        cmdInput.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') {
                const selected = document.querySelector('.cmd-item');
                if(selected) selected.click();
            }
        });
    }

    function renderCommands(query) {
        if(!cmdResults) return;
        cmdResults.innerHTML = '';
        const q = query.toLowerCase();
        
        let history = (JSON.parse(localStorage.getItem('notesHistory')) || []).map(h => ({
            title: h.title,
            icon: "fa-clock-rotate-left", 
            tag: "History",
            action: () => { 
                userInput.value = h.o; 
                aiOutput.innerHTML = marked.parse(h.r);
                if(window.renderMathInElement) renderMathInElement(aiOutput, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}] });
                aiOutput.classList.remove('empty-state');
                enableLiveCode();
            }
        }));

        const allItems = [...actions, ...history].filter(item => 
            item.title.toLowerCase().includes(q)
        );

        if(allItems.length === 0) {
            cmdResults.innerHTML = '<div style="padding:15px; color:#64748b; text-align:center;">No commands found</div>';
            return;
        }

        allItems.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = `cmd-item ${index === 0 ? 'selected' : ''}`;
            el.innerHTML = `
                <div class="cmd-icon"><i class="fa-solid ${item.icon}" style="color: ${item.tag === 'Theme' ? 'var(--primary)' : ''}"></i></div>
                <div class="cmd-text">${item.title}</div>
                <div class="cmd-tag">${item.tag}</div>
            `;
            el.onclick = () => {
                item.action();
                togglePalette();
            };
            cmdResults.appendChild(el);
        });
    }

    // ==========================================
    // 3. CORE FEATURES (Mic, Audio, Code)
    // ==========================================
    
    // SPEECH RECOGNITION
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if(SpeechRecognition && micBtn) {
        recognition = new SpeechRecognition();
        recognition.continuous = false; recognition.lang = 'en-US'; recognition.interimResults = false;
        micBtn.addEventListener('click', () => {
            if(micBtn.classList.contains('recording')) { recognition.stop(); } 
            else { try { recognition.start(); micBtn.classList.add('recording'); showToast("Listening..."); } catch(e) { showToast("Error starting mic"); } }
        });
        recognition.onresult = (e) => {
            userInput.value += (userInput.value.length > 0 ? ' ' : '') + e.results[0][0].transcript;
            userInput.dispatchEvent(new Event('input'));
        };
        recognition.onend = () => micBtn.classList.remove('recording');
        recognition.onerror = () => micBtn.classList.remove('recording');
    } else if (micBtn) { micBtn.style.display = 'none'; }

    // NEW NOTE
    newNoteBtn.addEventListener('click', () => {
        userInput.value = '';
        aiOutput.innerHTML = `<i class="fa-solid fa-layer-group"></i><p>Result appears here</p>`;
        aiOutput.classList.add('empty-state');
        document.getElementById('inputStats').innerText = "0 words";
        window.speechSynthesis.cancel();
        showToast("New Note Started");
    });

    // AUDIO PLAYBACK (PODCAST MODE)
    let speech = new SpeechSynthesisUtterance();
    let isSpeaking = false;
    let speeds = [1, 1.5, 2];
    let speedIndex = 0;

    playAudioBtn.addEventListener('click', () => {
        if(isSpeaking) {
            window.speechSynthesis.pause(); isSpeaking = false; playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        } else {
            let textToRead = window.getSelection().toString() || aiOutput.innerText || userInput.value;
            if(!textToRead.trim()) { showToast("Nothing to read"); return; }
            if(window.speechSynthesis.paused) { window.speechSynthesis.resume(); } 
            else { window.speechSynthesis.cancel(); speech.text = textToRead; speech.rate = speeds[speedIndex]; window.speechSynthesis.speak(speech); }
            isSpeaking = true; playAudioBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        }
    });
    stopAudioBtn.addEventListener('click', () => { window.speechSynthesis.cancel(); isSpeaking = false; playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; });
    speedBtn.addEventListener('click', () => {
        speedIndex = (speedIndex + 1) % speeds.length; speedBtn.innerText = speeds[speedIndex] + 'x';
        if(window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); speech.rate = speeds[speedIndex]; window.speechSynthesis.speak(speech); }
    });
    speech.onend = () => { isSpeaking = false; playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; };

    // FOCUS MODE
    focusBtn.addEventListener('click', () => {
        sidebar.classList.add('hidden'); topHeader.classList.add('hidden'); outputPanel.classList.add('hidden'); workspace.classList.add('zen'); exitFocusBtn.classList.add('show'); showToast("Focus Mode Active");
    });
    exitFocusBtn.addEventListener('click', () => {
        sidebar.classList.remove('hidden'); topHeader.classList.remove('hidden'); outputPanel.classList.remove('hidden'); workspace.classList.remove('zen'); exitFocusBtn.classList.remove('show');
    });

    // TEMPLATES
    window.setTemplate = (type) => {
        let txt = "";
        if(type === 'general') txt = "Topic: \nDate: \n\nKey Points:\n- ";
        if(type === 'flashcard') txt = "Term : Definition\nQuestion : Answer";
        if(type === 'code') txt = "Title: JS Loop\n\n```javascript\nfor(let i=0; i<5; i++) {\n    console.log('Count: ' + i);\n}\n```";
        if(type === 'math') txt = "$$ E = mc^2 $$";
        userInput.value = txt; userInput.focus();
    };

    // REFINE TEXT (AI & MATH & CODE)
    processBtn.addEventListener('click', async () => {
        const text = userInput.value.trim();
        if(!text) { showToast("Enter notes first"); return; }
        
        processBtn.disabled = true; processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        await new Promise(r => setTimeout(r, 600)); 
        
        const refined = smartFormat(text);
        aiOutput.innerHTML = marked.parse(refined);
        
        // Render Math (KaTeX)
        if(window.renderMathInElement) {
            renderMathInElement(aiOutput, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}] });
        }
        
        aiOutput.classList.remove('empty-state');
        enableLiveCode();
        
        saveToList('notesHistory', text, refined);
        loadList('notesHistory', historyList);
        processBtn.disabled = false; processBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Refine';
        showToast("Refined");
    });

    // LIVE CODE RUNNER
    function enableLiveCode() {
        const codes = aiOutput.querySelectorAll('pre code.language-javascript');
        codes.forEach(block => {
            const pre = block.parentElement;
            if(pre.querySelector('.run-btn')) return; 
            const btn = document.createElement('button');
            btn.className = 'run-btn'; btn.innerHTML = '<i class="fa-solid fa-play"></i> Run';
            pre.style.position = 'relative'; pre.appendChild(btn);
            const outputDiv = document.createElement('div');
            outputDiv.className = 'code-output'; outputDiv.innerText = "> Output...";
            pre.after(outputDiv);
            btn.addEventListener('click', () => {
                const code = block.innerText;
                outputDiv.classList.add('show'); outputDiv.innerText = "";
                const oldLog = console.log; const logs = [];
                console.log = (...args) => { logs.push(args.join(' ')); };
                try { eval(code); outputDiv.innerText = logs.length > 0 ? logs.join('\n') : "Done (No output)"; outputDiv.style.color = "var(--success)"; } 
                catch (err) { outputDiv.innerText = "Error: " + err.message; outputDiv.style.color = "#ef4444"; }
                console.log = oldLog;
            });
        });
    }

    // VISUALIZE
    visualizeBtn.addEventListener('click', async () => {
        const text = userInput.value.trim();
        if(!text) { showToast("Enter diagram code"); return; }
        aiOutput.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>';
        await new Promise(r => setTimeout(r, 500));
        try {
            let graph = text.includes('-->') ? `graph TD\n${text}` : `graph TD\nA[Start] --> B[${text.substring(0,10)}...]`;
            if(text.includes('graph')) graph = text;
            const uid = `mermaid-${Date.now()}`;
            aiOutput.innerHTML = `<div class="mermaid" id="${uid}">${graph}</div>`;
            aiOutput.classList.remove('empty-state');
            await mermaid.run({ nodes: [document.getElementById(uid)] });
        } catch (e) { aiOutput.innerHTML = `<p style="color:#ef4444; padding:20px;">Syntax Error</p>`; }
    });

    // STUDY MODE
    let cards = []; let cardIndex = 0;
    studyBtn.addEventListener('click', () => {
        const text = userInput.value.trim();
        cards = text.split('\n').reduce((acc, l) => {
            if(l.includes(':')) { const [f,b] = l.split(':'); acc.push({front:f.trim(), back:b.trim()}); } return acc;
        }, []);
        if(cards.length === 0) { showToast("Use 'Term : Definition'"); return; }
        cardIndex = 0; renderCard(); showToast("Study Mode");
    });
    function renderCard() {
        if(cardIndex >= cards.length) { showToast("End of Deck"); return; }
        const c = cards[cardIndex];
        aiOutput.innerHTML = `<div class="flashcard-container"><div class="flashcard" onclick="this.classList.toggle('flipped')"><div class="card-face card-front"><p>${c.front}</p><span style="font-size:0.75rem; color:grey; margin-top:auto;">(Click to Flip)</span></div><div class="card-face card-back"><p>${c.back}</p></div></div><div class="card-controls"><button class="control-btn" onclick="prevCard()">Prev</button><span>${cardIndex + 1}/${cards.length}</span><button class="control-btn" onclick="nextCard()">Next</button></div></div>`;
        aiOutput.classList.remove('empty-state');
    }
    window.nextCard = () => { if(cardIndex < cards.length - 1) { cardIndex++; renderCard(); } };
    window.prevCard = () => { if(cardIndex > 0) { cardIndex--; renderCard(); } };

    // UTILS
    userInput.addEventListener('input', (e) => document.getElementById('inputStats').innerText = `${e.target.value.trim().split(/\s+/).length} words`);
    function smartFormat(text) { return `# 📝 Refined Notes\n\n${text}`; }
    function showToast(msg) { toast.innerText = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2000); }
    function saveToList(k, o, r) { let l = JSON.parse(localStorage.getItem(k)) || []; l.unshift({id:Date.now(), title:o.substring(0,15)+"...", o, r}); localStorage.setItem(k, JSON.stringify(l)); }
    function loadList(k, c) {
        let l = JSON.parse(localStorage.getItem(k)) || []; c.innerHTML = '';
        l.forEach(i => {
            let el = document.createElement('div'); el.className='list-item'; el.innerText=i.title;
            el.onclick = () => { userInput.value=i.o; aiOutput.innerHTML=marked.parse(i.r); if(window.renderMathInElement) renderMathInElement(aiOutput, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}] }); aiOutput.classList.remove('empty-state'); enableLiveCode(); };
            c.appendChild(el);
        });
    }
    const toggle = (id, listId) => document.getElementById(id).addEventListener('click', () => { let el = document.getElementById(listId); el.style.display = el.style.display==='none'?'flex':'none'; });
    toggle('historyToggle', 'historyList'); toggle('savedToggle', 'savedList');
});