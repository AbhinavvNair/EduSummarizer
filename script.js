document.addEventListener('DOMContentLoaded', () => {
    // --- 1. INITIALIZATION ---
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
    }

    // --- 2. DOM ELEMENTS ---
    const userInput = document.getElementById('userInput');
    const aiOutput = document.getElementById('aiOutput');
    
    // Action Buttons
    const newNoteBtn = document.getElementById('newNoteBtn');
    const processBtn = document.getElementById('processBtn');
    const visualizeBtn = document.getElementById('visualizeBtn');
    const saveNoteBtn = document.getElementById('saveNoteBtn'); 
    const copyBtn = document.getElementById('copyBtn');
    const pdfBtn = document.getElementById('pdfBtn');
    
    // View Controls
    const focusBtn = document.getElementById('focusBtn'); 
    const exitFocusBtn = document.getElementById('exitFocusBtn'); 
    
    // Audio / Mic
    const playAudioBtn = document.getElementById('playAudioBtn');
    const stopAudioBtn = document.getElementById('stopAudioBtn');
    const speedBtn = document.getElementById('speedBtn');
    const micBtn = document.getElementById('micBtn');

    // Sidebar & Lists
    const historyToggle = document.getElementById('historyToggle');
    const historyList = document.getElementById('historyList');
    const savedToggle = document.getElementById('savedToggle');
    const savedList = document.getElementById('savedList');
    
    const sidebar = document.getElementById('sidebar');
    const topHeader = document.getElementById('topHeader');
    const outputPanel = document.getElementById('outputPanel');
    const workspace = document.getElementById('workspace');

    // God Mode
    const cmdPalette = document.getElementById('cmdPalette');
    const cmdInput = document.getElementById('cmdInput');
    const cmdResults = document.getElementById('cmdResults');
    const toast = document.getElementById('toast');

    // Theme Switch
    const themeCheckbox = document.getElementById("themeCheckbox");

    // State
    let currentRawResponse = ""; 

    // --- 3. LOAD DATA & THEMES ---
    loadList('notesHistory', historyList);
    loadList('savedNotes', savedList);
    
    // Load Accent Color
    const savedTheme = localStorage.getItem('userTheme');
    if(savedTheme) {
        const theme = JSON.parse(savedTheme);
        setTheme(theme.primary, theme.hover, false);
    }

    // Load Light/Dark Mode
    if (themeCheckbox) {
        let savedMode = localStorage.getItem("themeMode") || "dark";
        document.documentElement.classList.add(savedMode);
        themeCheckbox.checked = savedMode === "light";

        themeCheckbox.addEventListener("change", () => {
            if (themeCheckbox.checked) {
                document.documentElement.classList.remove("dark");
                document.documentElement.classList.add("light");
                localStorage.setItem("themeMode", "light");
                showToast("Light Mode Enabled");
            } else {
                document.documentElement.classList.remove("light");
                document.documentElement.classList.add("dark");
                localStorage.setItem("themeMode", "dark");
                showToast("Dark Mode Enabled");
            }
        });
    }

    // ==========================================
    // 4. SIDEBAR LOGIC
    // ==========================================
    if(historyToggle && historyList) {
        historyToggle.addEventListener('click', () => {
            const isHidden = historyList.style.display === 'none';
            historyList.style.display = isHidden ? 'flex' : 'none';
            historyToggle.classList.toggle('active', isHidden);
            if(isHidden && savedList) { savedList.style.display = 'none'; savedToggle.classList.remove('active'); }
        });
    }

    if(savedToggle && savedList) {
        savedToggle.addEventListener('click', () => {
            const isHidden = savedList.style.display === 'none';
            savedList.style.display = isHidden ? 'flex' : 'none';
            savedToggle.classList.toggle('active', isHidden);
            if(isHidden && historyList) { historyList.style.display = 'none'; historyToggle.classList.remove('active'); }
        });
    }

    // ==========================================
    // 5. SAVE NOTE LOGIC
    // ==========================================
    if(saveNoteBtn) {
        saveNoteBtn.addEventListener('click', () => {
            const content = currentRawResponse || aiOutput.innerText;
            let title = userInput.value.trim().substring(0, 25) || "Untitled Note";

            if(!content || content.includes("Ready for refinement") || content.trim().length === 0) {
                showToast("Generate a note first!"); return;
            }

            saveToList('savedNotes', title, content);
            loadList('savedNotes', savedList);
            
            if(savedList.style.display === 'none') {
                savedList.style.display = 'flex';
                savedToggle.classList.add('active');
                if(historyList) { historyList.style.display = 'none'; historyToggle.classList.remove('active'); }
            }
            showToast("Note Saved to Notebook");
        });
    }

    // ==========================================
    // 6. COPY BUTTON
    // ==========================================
    if(copyBtn) {
        copyBtn.addEventListener('click', () => {
            const textToCopy = aiOutput.innerText;
            if(!textToCopy || textToCopy.includes("Ready for refinement")) { showToast("Nothing to copy"); return; }
            navigator.clipboard.writeText(textToCopy).then(() => showToast("Copied to Clipboard")).catch(() => showToast("Copy Failed"));
        });
    }

    // ==========================================
    // 7. CORE AI ENGINE (GROQ)
    // ==========================================
    processBtn.addEventListener('click', async () => {
        const text = userInput.value.trim();
        if(!text) { showToast("Enter notes first"); return; }
        
        processBtn.disabled = true; 
        processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Thinking...';
        
        try {
            const response = await fetch("http://127.0.0.1:8000/generate", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: text }),
            });

            if (!response.ok) throw new Error("Backend Error");
            const data = await response.json();
            
            currentRawResponse = data.response; 
            aiOutput.innerHTML = marked.parse(data.response);
            
            if(window.renderMathInElement) {
                renderMathInElement(aiOutput, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}] });
            }
            
            aiOutput.classList.remove('empty-state');
            enableLiveCode();
            saveToList('notesHistory', text, data.response);
            loadList('notesHistory', historyList);
            showToast("Refinement Complete");

        } catch (error) { showToast("Error: " + error.message); } 
        finally { processBtn.disabled = false; processBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Refine'; }
    });

    // ==========================================
    // 8. VISUALIZATION ENGINE
    // ==========================================
    if(visualizeBtn) {
        visualizeBtn.addEventListener('click', async () => {
            const text = userInput.value.trim() || aiOutput.innerText;
            if(!text || text.length < 5) { showToast("Enter more text"); return; }

            visualizeBtn.disabled = true;
            const originalIcon = visualizeBtn.innerHTML;
            visualizeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            showToast("Designing Diagram...");

            const prompt = `Based on the following text, generate a MERMAID.JS graph code (graph TD or mindmap). 
            STRICT RULE: Output ONLY the code block inside \`\`\`mermaid ... \`\`\`.
            Text: ${text.substring(0, 1500)}`; 

            try {
                const response = await fetch("http://127.0.0.1:8000/generate", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: prompt, temperature: 0.2 }), 
                });

                if (!response.ok) throw new Error("Backend Error");
                const data = await response.json();
                const match = data.response.match(/```mermaid([\s\S]*?)```/);
                const mermaidCode = match ? match[1].trim() : data.response;

                aiOutput.innerHTML = `<div class="mermaid">${mermaidCode}</div>`;
                aiOutput.classList.remove('empty-state');
                await mermaid.run({ nodes: [aiOutput.querySelector('.mermaid')] });
                showToast("Diagram Created");

            } catch (error) { console.error(error); showToast("Visualization Failed"); } 
            finally { visualizeBtn.disabled = false; visualizeBtn.innerHTML = originalIcon; }
        });
    }

    // ==========================================
    // 9. PDF EXPORT
    // ==========================================
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            if (typeof html2pdf === 'undefined') { alert("PDF Library Missing"); return; }
            if (aiOutput.classList.contains('empty-state')) { showToast("Nothing to export"); return; }
            
            showToast("Generating PDF...");
            const originalIcon = pdfBtn.innerHTML;
            pdfBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; 
            
            html2pdf().set({ 
                margin: 0.5, 
                filename: 'EduSummarizer_Export.pdf', 
                image: { type: 'jpeg', quality: 0.98 }, 
                html2canvas: { scale: 2, useCORS: true }, 
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } 
            }).from(aiOutput).save()
              .then(() => showToast("PDF Downloaded"))
              .finally(() => pdfBtn.innerHTML = originalIcon);
        });
    }

    // ==========================================
    // 10. GOD MODE (GROUPED SECTIONS)
    // ==========================================
    function toggleGodMode() {
        if(!cmdPalette) return;
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

    if(cmdPalette) cmdPalette.addEventListener('click', (e) => { if (e.target === cmdPalette) toggleGodMode(); });

    function setTheme(primary, hover, notify = true) {
        document.documentElement.style.setProperty('--primary', primary);
        document.documentElement.style.setProperty('--primary-hover', hover);
        localStorage.setItem('userTheme', JSON.stringify({ primary, hover }));
        if(notify) showToast("Theme Updated");
    }

    const actions = [
        // GENERAL COMMANDS
        { title: "New Note", icon: "fa-plus", tag: "Action", action: () => newNoteBtn.click() },
        { title: "Refine Text", icon: "fa-wand-magic-sparkles", tag: "AI", action: () => processBtn.click() },
        { title: "Save Note", icon: "fa-bookmark", tag: "Action", action: () => saveNoteBtn.click() },
        { title: "Export PDF", icon: "fa-file-pdf", tag: "File", action: () => pdfBtn ? pdfBtn.click() : null }, 
        { title: "Visualize", icon: "fa-diagram-project", tag: "Tool", action: () => visualizeBtn.click() },
        { title: "Focus Mode", icon: "fa-expand", tag: "View", action: () => focusBtn.click() },
        { title: "Podcast Play", icon: "fa-play", tag: "Audio", action: () => playAudioBtn.click() },
        { title: "Clear Data", icon: "fa-trash", tag: "Data", action: () => { if(confirm("Clear All?")) { localStorage.clear(); location.reload(); } } },

        // THEMES
        { title: "Theme: Default Blue", icon: "fa-droplet", tag: "Color", action: () => setTheme('#818CF8', '#6366F1') },
        { title: "Theme: Hacker Green", icon: "fa-terminal", tag: "Color", action: () => setTheme('#34d399', '#10b981') },
        { title: "Theme: Crimson Red", icon: "fa-fire", tag: "Color", action: () => setTheme('#ef4444', '#dc2626') },
        { title: "Theme: Royal Gold", icon: "fa-crown", tag: "Color", action: () => setTheme('#fbbf24', '#d97706') },
        { title: "Theme: Sunset Orange", icon: "fa-sun", tag: "Color", action: () => setTheme('#fb923c', '#ea580c') },
        { title: "Theme: Electric Violet", icon: "fa-bolt", tag: "Color", action: () => setTheme('#a78bfa', '#7c3aed') },
        { title: "Theme: Hot Pink", icon: "fa-heart", tag: "Color", action: () => setTheme('#f472b6', '#db2777') },
        { title: "Theme: Cyberpunk Teal", icon: "fa-microchip", tag: "Color", action: () => setTheme('#2dd4bf', '#0d9488') },
        { title: "Theme: Slate Grey", icon: "fa-mountain", tag: "Color", action: () => setTheme('#94a3b8', '#475569') },
        { title: "Theme: Mint Fresh", icon: "fa-leaf", tag: "Color", action: () => setTheme('#6ee7b7', '#059669') }
    ];

    if(cmdInput) {
        cmdInput.addEventListener('input', (e) => renderCommands(e.target.value));
        cmdInput.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') { const selected = document.querySelector('.cmd-item'); if(selected) selected.click(); }
        });
    }

    // --- NEW GROUPED RENDER FUNCTION ---
    function renderCommands(query) {
        if(!cmdResults) return; cmdResults.innerHTML = '';
        const q = query.toLowerCase();
        
        // 1. Get History Items
        let history = (JSON.parse(localStorage.getItem('notesHistory')) || []).map(h => ({
            title: h.title, icon: "fa-clock-rotate-left", tag: "History",
            action: () => { userInput.value = h.o; aiOutput.innerHTML = marked.parse(h.r); aiOutput.classList.remove('empty-state'); currentRawResponse = h.r; enableLiveCode(); }
        }));

        // 2. Filter All Items
        const filteredActions = actions.filter(item => item.title.toLowerCase().includes(q) && item.tag !== 'Color');
        const filteredThemes = actions.filter(item => item.title.toLowerCase().includes(q) && item.tag === 'Color');
        const filteredHistory = history.filter(item => item.title.toLowerCase().includes(q));

        // 3. Helper to render a section
        const renderSection = (title, items) => {
            if(items.length === 0) return;
            
            // Render Header
            const header = document.createElement('div');
            header.className = 'cmd-category-title';
            header.innerText = title;
            cmdResults.appendChild(header);

            // Render Items
            items.forEach((item, index) => {
                const el = document.createElement('div');
                el.className = `cmd-item`;
                el.innerHTML = `<div class="cmd-icon"><i class="fa-solid ${item.icon}"></i></div><div class="cmd-text">${item.title}</div><div class="cmd-tag">${item.tag}</div>`;
                el.onclick = () => { item.action(); toggleGodMode(); };
                cmdResults.appendChild(el);
            });
        };

        // 4. Render Groups
        if (filteredActions.length + filteredThemes.length + filteredHistory.length === 0) {
            cmdResults.innerHTML = '<div style="padding:15px; color:#64748b; text-align:center;">No actions found</div>';
            return;
        }

        renderSection("Commands", filteredActions);
        renderSection("Themes", filteredThemes);
        renderSection("History", filteredHistory);

        // Auto-select first item
        const first = cmdResults.querySelector('.cmd-item');
        if(first) first.classList.add('selected');
    }

    // ==========================================
    // 11. AUDIO & MIC
    // ==========================================
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

    let speech = new SpeechSynthesisUtterance();
    let speeds = [1, 1.5, 2]; let speedIndex = 0;
    
    if(playAudioBtn) playAudioBtn.addEventListener('click', () => {
        if(window.speechSynthesis.speaking && !window.speechSynthesis.paused) { window.speechSynthesis.pause(); playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; }
        else if(window.speechSynthesis.paused) { window.speechSynthesis.resume(); playAudioBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; }
        else {
            let t = window.getSelection().toString() || aiOutput.innerText || userInput.value;
            if(!t || t.includes("Ready")) return;
            window.speechSynthesis.cancel(); speech.text = t; speech.rate = speeds[speedIndex];
            window.speechSynthesis.speak(speech); playAudioBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        }
    });
    
    if(stopAudioBtn) stopAudioBtn.addEventListener('click', () => { window.speechSynthesis.cancel(); playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; });
    if(speedBtn) speedBtn.addEventListener('click', () => { speedIndex = (speedIndex + 1) % speeds.length; speedBtn.innerText = speeds[speedIndex] + 'x'; });
    speech.onend = () => playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>';

    // ==========================================
    // 12. HELPER FUNCTIONS
    // ==========================================
    
    function enableLiveCode() {
        const codes = aiOutput.querySelectorAll('pre code');
        codes.forEach(block => {
            if(!block.className.includes('javascript')) return;
            const pre = block.parentElement; if(pre.querySelector('.run-btn')) return;
            const btn = document.createElement('button'); btn.className = 'run-btn'; btn.innerHTML = '<i class="fa-solid fa-play"></i> Run';
            pre.appendChild(btn);
            const outputDiv = document.createElement('div'); outputDiv.className = 'code-output'; outputDiv.innerText = "> Output..."; pre.after(outputDiv);

            btn.addEventListener('click', () => {
                const code = block.innerText;
                outputDiv.classList.add('show'); 
                const logs = []; const oldLog = console.log; console.log = (...args) => logs.push(args.join(' '));
                try { 
                    eval(code); 
                    outputDiv.innerText = logs.length > 0 ? logs.join('\n') : "Executed successfully"; 
                    outputDiv.style.color = "#10b981"; 
                } catch (err) { 
                    outputDiv.innerText = "Error: " + err.message; 
                    outputDiv.style.color = "#ef4444"; 
                }
                console.log = oldLog;
            });
        });
    }

    focusBtn.addEventListener('click', () => { sidebar.classList.add('hidden'); topHeader.classList.add('hidden'); outputPanel.classList.add('hidden'); workspace.classList.add('zen'); exitFocusBtn.classList.add('show'); });
    exitFocusBtn.addEventListener('click', () => { sidebar.classList.remove('hidden'); topHeader.classList.remove('hidden'); outputPanel.classList.remove('hidden'); workspace.classList.remove('zen'); exitFocusBtn.classList.remove('show'); });
    newNoteBtn.addEventListener('click', () => { userInput.value=''; aiOutput.innerHTML='<i class="fa-solid fa-layer-group"></i><p>Ready</p>'; aiOutput.classList.add('empty-state'); currentRawResponse=""; });
    userInput.addEventListener('input', (e) => document.getElementById('inputStats').innerText = `${e.target.value.trim().split(/\s+/).length} words`);

    function showToast(msg) { toast.innerText=msg; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),2000); }
    
    function saveToList(key, title, content) { 
        let list = JSON.parse(localStorage.getItem(key)) || []; 
        list.unshift({id:Date.now(), title: title.substring(0,25)+"...", o: "", r: content}); 
        localStorage.setItem(key, JSON.stringify(list.slice(0, 20))); 
    }
    
    function loadList(key, container) {
        if(!container) return; 
        let list = JSON.parse(localStorage.getItem(key)) || []; 
        container.innerHTML = '';
        list.forEach(item => {
            let el = document.createElement('div'); el.className='list-item'; el.innerText=item.title;
            el.onclick = () => { 
                if(item.o) userInput.value = item.o;
                aiOutput.innerHTML = marked.parse(item.r); 
                aiOutput.classList.remove('empty-state'); 
                currentRawResponse = item.r; 
                enableLiveCode();
                if(window.innerWidth < 800) sidebar.classList.add('hidden');
            };
            container.appendChild(el);
        });
    }
});