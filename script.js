document.addEventListener('DOMContentLoaded', () => {
    // Initialize Charts
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: false, theme: 'dark' });
    }

    // --- DOM ELEMENTS ---
    const userInput = document.getElementById('userInput');
    const aiOutput = document.getElementById('aiOutput');
    const newNoteBtn = document.getElementById('newNoteBtn');
    const processBtn = document.getElementById('processBtn');
    const visualizeBtn = document.getElementById('visualizeBtn');
    const studyBtn = document.getElementById('studyBtn'); 
    const focusBtn = document.getElementById('focusBtn'); 
    const exitFocusBtn = document.getElementById('exitFocusBtn'); 
    const toast = document.getElementById('toast');
    
    // GOD MODE ELEMENTS
    const cmdPalette = document.getElementById('cmdPalette');
    const cmdInput = document.getElementById('cmdInput');
    const cmdResults = document.getElementById('cmdResults');

    const micBtn = document.getElementById('micBtn');
    const sidebar = document.getElementById('sidebar');
    const topHeader = document.getElementById('topHeader');
    const outputPanel = document.getElementById('outputPanel');
    const workspace = document.getElementById('workspace');
    
    // Lists
    const historyList = document.getElementById('historyList');
    const savedList = document.getElementById('savedList');

    // Load Data & Saved Theme
    loadList('notesHistory', historyList);
    loadList('savedNotes', savedList);
    
    const savedTheme = localStorage.getItem('userTheme');
    if(savedTheme) {
        const theme = JSON.parse(savedTheme);
        setTheme(theme.primary, theme.hover, false);
    }

    // ==========================================
    // 1. GOD MODE (CTRL + K)
    // ==========================================
    
    function toggleGodMode() {
        if(!cmdPalette) return;
        const isHidden = cmdPalette.classList.contains('hidden');
        if (isHidden) {
            cmdPalette.classList.remove('hidden');
            setTimeout(() => cmdPalette.classList.add('show'), 10);
            cmdInput.value = '';
            cmdInput.placeholder = "GOD MODE: Waiting for command...";
            cmdInput.focus();
            renderCommands(''); 
        } else {
            cmdPalette.classList.remove('show');
            setTimeout(() => cmdPalette.classList.add('hidden'), 200);
        }
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Trigger God Mode
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            toggleGodMode();
        }
        // Close on Escape
        if (e.key === 'Escape' && cmdPalette && !cmdPalette.classList.contains('hidden')) {
            toggleGodMode();
        }
    });

    // Close on overlay click
    if(cmdPalette) {
        cmdPalette.addEventListener('click', (e) => {
            if (e.target === cmdPalette) toggleGodMode();
        });
    }

    // --- THEME ENGINE ---
    function setTheme(primary, hover, notify = true) {
        document.documentElement.style.setProperty('--primary', primary);
        document.documentElement.style.setProperty('--primary-hover', hover);
        localStorage.setItem('userTheme', JSON.stringify({ primary, hover }));
        if(notify) showToast("Theme Updated");
    }

    // --- GOD MODE ACTIONS (The Mega List) ---
    const actions = [
        // Core Tools
        { title: "New Note", icon: "fa-plus", tag: "Action", action: () => newNoteBtn.click() },
        { title: "Refine Text (AI)", icon: "fa-wand-magic-sparkles", tag: "AI", action: () => processBtn.click() },
        { title: "Focus Mode", icon: "fa-expand", tag: "View", action: () => focusBtn.click() },
        { title: "Visualize Diagram", icon: "fa-diagram-project", tag: "Tool", action: () => visualizeBtn.click() },
        { title: "Study Flashcards", icon: "fa-graduation-cap", tag: "Study", action: () => studyBtn.click() },
        
        // --- THEME PACK (God Mode Exclusive) ---
        // Blues & Purples
        { title: "Theme: Default Blue", icon: "fa-droplet", tag: "Theme", action: () => setTheme('#818CF8', '#6366F1') },
        { title: "Theme: Electric Violet", icon: "fa-bolt", tag: "Theme", action: () => setTheme('#a78bfa', '#8b5cf6') },
        { title: "Theme: Deep Ocean", icon: "fa-water", tag: "Theme", action: () => setTheme('#38bdf8', '#0ea5e9') },
        
        // Greens & Teals
        { title: "Theme: Hacker Green", icon: "fa-terminal", tag: "Theme", action: () => setTheme('#34d399', '#10b981') },
        { title: "Theme: Mint Fresh", icon: "fa-leaf", tag: "Theme", action: () => setTheme('#2dd4bf', '#14b8a6') },
        { title: "Theme: Toxic Lime", icon: "fa-biohazard", tag: "Theme", action: () => setTheme('#a3e635', '#84cc16') },
        
        // Warm Colors
        { title: "Theme: Cyberpunk Pink", icon: "fa-backward", tag: "Theme", action: () => setTheme('#f472b6', '#ec4899') },
        { title: "Theme: Crimson Red", icon: "fa-fire", tag: "Theme", action: () => setTheme('#f87171', '#ef4444') },
        { title: "Theme: Sunset Orange", icon: "fa-sun", tag: "Theme", action: () => setTheme('#fb923c', '#f97316') },
        { title: "Theme: Royal Gold", icon: "fa-crown", tag: "Theme", action: () => setTheme('#fbbf24', '#f59e0b') },
        
        // Monochrome
        { title: "Theme: Zen Gray", icon: "fa-mountain", tag: "Theme", action: () => setTheme('#94a3b8', '#64748b') },

        // Data
        { title: "Clear History", icon: "fa-trash", tag: "Data", action: () => { if(confirm("Clear history?")) { localStorage.removeItem('notesHistory'); location.reload(); } } }
    ];

    // Search Logic
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
        
        // Include History in God Mode
        let history = (JSON.parse(localStorage.getItem('notesHistory')) || []).map(h => ({
            title: h.title,
            icon: "fa-clock-rotate-left", 
            tag: "History",
            action: () => { 
                userInput.value = h.o; 
                aiOutput.innerHTML = marked.parse(h.r);
                aiOutput.classList.remove('empty-state');
                enableLiveCode();
            }
        }));

        const allItems = [...actions, ...history].filter(item => 
            item.title.toLowerCase().includes(q)
        );

        if(allItems.length === 0) {
            cmdResults.innerHTML = '<div style="padding:15px; color:#64748b; text-align:center;">No God Mode actions found</div>';
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
                toggleGodMode();
            };
            cmdResults.appendChild(el);
        });
    }

    // ==========================================
    // 2. MIC / VOICE DICTATION
    // ==========================================
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    
    if (SpeechRecognition && micBtn) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US'; 
        recognition.interimResults = false;

        micBtn.addEventListener('click', () => {
            if (micBtn.classList.contains('recording')) {
                recognition.stop();
            } else {
                try {
                    recognition.start();
                    micBtn.classList.add('recording');
                    showToast("Listening...");
                } catch (e) {
                    showToast("Mic Error");
                }
            }
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value += (userInput.value.length > 0 ? ' ' : '') + transcript;
            userInput.dispatchEvent(new Event('input'));
        };

        recognition.onend = () => micBtn.classList.remove('recording');
    }

    // ==========================================
    // 3. CORE AI LOGIC (Groq Backend)
    // ==========================================
    processBtn.addEventListener('click', async () => {
        const text = userInput.value.trim();
        if(!text) { showToast("Enter notes first"); return; }
        
        processBtn.disabled = true; 
        processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Thinking...';
        
        try {
            const response = await fetch("http://127.0.0.1:8000/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: text,
                    max_tokens: 1000,
                    temperature: 0.7
                }),
            });

            if (!response.ok) throw new Error("Backend Error. Check Terminal.");

            const data = await response.json();
            const refined = data.response; 

            aiOutput.innerHTML = marked.parse(refined);
            
            if(window.renderMathInElement) {
                renderMathInElement(aiOutput, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}] });
            }
            
            aiOutput.classList.remove('empty-state');
            enableLiveCode();
            
            saveToList('notesHistory', text, refined);
            loadList('notesHistory', historyList);
            showToast("Refinement Complete");

        } catch (error) {
            showToast("Error: " + error.message);
        } finally {
            processBtn.disabled = false; 
            processBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Refine';
        }
    });

    // --- Live Code Runner ---
    function enableLiveCode() {
        const codes = aiOutput.querySelectorAll('pre code');
        codes.forEach(block => {
            if(!block.className.includes('language-javascript')) return;
            const pre = block.parentElement;
            if(pre.querySelector('.run-btn')) return; 

            const btn = document.createElement('button');
            btn.className = 'run-btn'; 
            btn.innerHTML = '<i class="fa-solid fa-play"></i> Run';
            pre.style.position = 'relative'; 
            pre.appendChild(btn);

            const outputDiv = document.createElement('div');
            outputDiv.className = 'code-output'; 
            outputDiv.innerText = "> Output...";
            pre.after(outputDiv);

            btn.addEventListener('click', () => {
                const code = block.innerText;
                outputDiv.classList.add('show'); 
                const logs = [];
                const oldLog = console.log; 
                console.log = (...args) => { logs.push(args.join(' ')); };
                
                try { 
                    eval(code); 
                    outputDiv.innerText = logs.length > 0 ? logs.join('\n') : "Done (No output)"; 
                    outputDiv.style.color = "#10b981"; 
                } catch (err) { 
                    outputDiv.innerText = "Error: " + err.message; 
                    outputDiv.style.color = "#ef4444"; 
                }
                console.log = oldLog;
            });
        });
    }

    // --- Focus Mode ---
    focusBtn.addEventListener('click', () => {
        sidebar.classList.add('hidden');
        topHeader.classList.add('hidden');
        outputPanel.classList.add('hidden');
        workspace.classList.add('zen');
        exitFocusBtn.classList.add('show');
        showToast("Focus Mode Active");
    });
    
    exitFocusBtn.addEventListener('click', () => {
        sidebar.classList.remove('hidden');
        topHeader.classList.remove('hidden');
        outputPanel.classList.remove('hidden');
        workspace.classList.remove('zen');
        exitFocusBtn.classList.remove('show');
    });

    // --- New Note ---
    newNoteBtn.addEventListener('click', () => {
        userInput.value = '';
        aiOutput.innerHTML = `<i class="fa-solid fa-layer-group"></i><p>Result appears here</p>`;
        aiOutput.classList.add('empty-state');
        document.getElementById('inputStats').innerText = "0 words";
        showToast("New Note");
    });

    // --- Utils ---
    userInput.addEventListener('input', (e) => document.getElementById('inputStats').innerText = `${e.target.value.trim().split(/\s+/).length} words`);

    function showToast(msg) { 
        if(!toast) return;
        toast.innerText = msg; 
        toast.classList.add('show'); 
        setTimeout(() => toast.classList.remove('show'), 2000); 
    }

    function saveToList(k, o, r) { 
        let l = JSON.parse(localStorage.getItem(k)) || []; 
        l.unshift({id:Date.now(), title:o.substring(0,15)+"...", o, r}); 
        localStorage.setItem(k, JSON.stringify(l.slice(0, 15))); 
    }

    function loadList(k, c) {
        if(!c) return;
        let l = JSON.parse(localStorage.getItem(k)) || []; c.innerHTML = '';
        l.forEach(i => {
            let el = document.createElement('div'); el.className='list-item'; el.innerText=i.title;
            el.onclick = () => { 
                userInput.value=i.o; 
                aiOutput.innerHTML=marked.parse(i.r); 
                aiOutput.classList.remove('empty-state');
                enableLiveCode();
            };
            c.appendChild(el);
        });
    }
});