document.addEventListener('DOMContentLoaded', () => {
    // Initialize Charts (Mermaid)
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
    }

    // --- DOM ELEMENTS ---
    const userInput = document.getElementById('userInput');
    const aiOutput = document.getElementById('aiOutput');
    const newNoteBtn = document.getElementById('newNoteBtn');
    const processBtn = document.getElementById('processBtn');
    
    // VISUALIZE BUTTON (The Star of the Show)
    const visualizeBtn = document.getElementById('visualizeBtn');
    
    const focusBtn = document.getElementById('focusBtn'); 
    const exitFocusBtn = document.getElementById('exitFocusBtn'); 
    const toast = document.getElementById('toast');
    const pdfBtn = document.getElementById('pdfBtn'); // PDF Fixed
    
    // Audio Elements
    const playAudioBtn = document.getElementById('playAudioBtn');
    const stopAudioBtn = document.getElementById('stopAudioBtn');
    const speedBtn = document.getElementById('speedBtn');

    // God Mode Elements
    const cmdPalette = document.getElementById('cmdPalette');
    const cmdInput = document.getElementById('cmdInput');
    const cmdResults = document.getElementById('cmdResults');
    const micBtn = document.getElementById('micBtn');
    
    // Lists & Layout
    const historyList = document.getElementById('historyList');
    const savedList = document.getElementById('savedList');
    const sidebar = document.getElementById('sidebar');
    const topHeader = document.getElementById('topHeader');
    const outputPanel = document.getElementById('outputPanel');
    const workspace = document.getElementById('workspace');

    // Load Data
    loadList('notesHistory', historyList);
    loadList('savedNotes', savedList);
    
    // Load Theme
    const savedTheme = localStorage.getItem('userTheme');
    if(savedTheme) {
        const theme = JSON.parse(savedTheme);
        setTheme(theme.primary, theme.hover, false);
    }

    // ==========================================
    // 1. VISUALIZATION ENGINE (NEW)
    // ==========================================
    if(visualizeBtn) {
        visualizeBtn.addEventListener('click', async () => {
            const text = userInput.value.trim() || aiOutput.innerText;
            if(!text || text.length < 5) { showToast("Enter more text to visualize"); return; }

            // UI Feedback
            visualizeBtn.disabled = true;
            const originalIcon = visualizeBtn.innerHTML;
            visualizeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            showToast("Designing Diagram...");

            // Special Prompt for Diagrams
            const prompt = `Based on the following text, generate a MERMAID.JS graph code (graph TD or mindmap). 
            STRICT RULE: Output ONLY the code block inside \`\`\`mermaid ... \`\`\`. Do not say "Here is the code".
            Text to visualize:
            ${text.substring(0, 1500)}`; // Limit char count to avoid lag

            try {
                // Use existing backend
                const response = await fetch("http://127.0.0.1:8000/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: prompt, temperature: 0.2 }), // Low temp for precise code
                });

                if (!response.ok) throw new Error("Backend Error");
                const data = await response.json();
                
                // Extract Code Block using Regex
                const match = data.response.match(/```mermaid([\s\S]*?)```/);
                const mermaidCode = match ? match[1].trim() : data.response;

                // Render
                aiOutput.innerHTML = `<div class="mermaid">${mermaidCode}</div>`;
                aiOutput.classList.remove('empty-state');
                
                // Trigger Mermaid Render
                await mermaid.run({ nodes: [aiOutput.querySelector('.mermaid')] });
                showToast("Diagram Created");

            } catch (error) {
                console.error(error);
                showToast("Visualization Failed");
                aiOutput.innerText = "Error generating diagram. Try simpler text.";
            } finally {
                visualizeBtn.disabled = false;
                visualizeBtn.innerHTML = originalIcon;
            }
        });
    }

    // ==========================================
    // 2. PDF EXPORT (FOOLPROOF)
    // ==========================================
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            if (typeof html2pdf === 'undefined') {
                alert("Error: PDF Library missing."); return;
            }
            if (aiOutput.classList.contains('empty-state') || !aiOutput.innerText.trim()) {
                showToast("Nothing to export"); return;
            }

            showToast("Generating PDF...");
            const originalIcon = pdfBtn.innerHTML;
            pdfBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; 

            const opt = {
                margin: 0.5, filename: 'NeuroNotes_Export.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true }, 
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(aiOutput).save()
                .then(() => showToast("PDF Downloaded"))
                .catch(err => { console.error(err); alert("PDF Error: " + err.message); })
                .finally(() => pdfBtn.innerHTML = originalIcon);
        });
    }

    // ==========================================
    // 3. GOD MODE (CTRL + K)
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

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault(); toggleGodMode();
        }
        if (e.key === 'Escape' && cmdPalette && !cmdPalette.classList.contains('hidden')) {
            toggleGodMode();
        }
    });

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

    // --- GOD MODE ACTIONS ---
    const actions = [
        { title: "New Note", icon: "fa-plus", tag: "Action", action: () => newNoteBtn.click() },
        { title: "Refine Text (AI)", icon: "fa-wand-magic-sparkles", tag: "AI", action: () => processBtn.click() },
        { title: "Export PDF", icon: "fa-file-pdf", tag: "File", action: () => pdfBtn ? pdfBtn.click() : null }, 
        { title: "Podcast Play", icon: "fa-play", tag: "Audio", action: () => playAudioBtn.click() },
        { title: "Focus Mode", icon: "fa-expand", tag: "View", action: () => focusBtn.click() },
        { title: "Visualize Diagram", icon: "fa-diagram-project", tag: "Tool", action: () => visualizeBtn.click() },
        
        { title: "Theme: Default Blue", icon: "fa-droplet", tag: "Theme", action: () => setTheme('#818CF8', '#6366F1') },
        { title: "Theme: Hacker Green", icon: "fa-terminal", tag: "Theme", action: () => setTheme('#34d399', '#10b981') },
        { title: "Theme: Electric Violet", icon: "fa-bolt", tag: "Theme", action: () => setTheme('#a78bfa', '#8b5cf6') },
        { title: "Theme: Crimson Red", icon: "fa-fire", tag: "Theme", action: () => setTheme('#f87171', '#ef4444') },
        
        { title: "Clear History", icon: "fa-trash", tag: "Data", action: () => { if(confirm("Clear history?")) { localStorage.removeItem('notesHistory'); location.reload(); } } }
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
                aiOutput.classList.remove('empty-state');
                enableLiveCode();
            }
        }));

        const allItems = [...actions, ...history].filter(item => 
            item.title.toLowerCase().includes(q)
        );

        if(allItems.length === 0) {
            cmdResults.innerHTML = '<div style="padding:15px; color:#64748b; text-align:center;">No actions found</div>';
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
    // 4. MIC / PODCAST / AI
    // ==========================================
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    // MIC
    if (SpeechRecognition && micBtn) {
        let recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';

        micBtn.addEventListener('click', () => {
            if (micBtn.classList.contains('recording')) {
                recognition.stop();
            } else {
                try {
                    recognition.start();
                    micBtn.classList.add('recording');
                    showToast("Listening...");
                } catch (e) { showToast("Mic Error"); }
            }
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value += (userInput.value.length > 0 ? ' ' : '') + transcript;
            userInput.dispatchEvent(new Event('input'));
        };

        recognition.onend = () => micBtn.classList.remove('recording');
    }

    // PODCAST
    let speech = new SpeechSynthesisUtterance();
    let isSpeaking = false;
    let speeds = [1, 1.5, 2];
    let speedIndex = 0;

    if(playAudioBtn) {
        playAudioBtn.addEventListener('click', () => {
            if(isSpeaking) {
                if(window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                    playAudioBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                } else {
                    window.speechSynthesis.pause();
                    playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                }
            } else {
                let textToRead = window.getSelection().toString() || aiOutput.innerText || userInput.value;
                if(!textToRead.trim() || textToRead.includes("Result appears here")) { showToast("Nothing to read"); return; }
                
                window.speechSynthesis.cancel();
                speech.text = textToRead;
                speech.rate = speeds[speedIndex];
                window.speechSynthesis.speak(speech);
                isSpeaking = true;
                playAudioBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            }
        });
    }

    if(stopAudioBtn) {
        stopAudioBtn.addEventListener('click', () => { 
            window.speechSynthesis.cancel(); 
            isSpeaking = false; 
            playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; 
        });
    }

    if(speedBtn) {
        speedBtn.addEventListener('click', () => {
            speedIndex = (speedIndex + 1) % speeds.length; 
            speedBtn.innerText = speeds[speedIndex] + 'x';
        });
    }

    speech.onend = () => { isSpeaking = false; playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; };

    // AI Logic
    processBtn.addEventListener('click', async () => {
        const text = userInput.value.trim();
        if(!text) { showToast("Enter notes first"); return; }
        
        processBtn.disabled = true; 
        processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Thinking...';
        
        try {
            const response = await fetch("http://127.0.0.1:8000/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: text }),
            });

            if (!response.ok) throw new Error("Backend Error");
            const data = await response.json();
            aiOutput.innerHTML = marked.parse(data.response);
            
            if(window.renderMathInElement) {
                renderMathInElement(aiOutput, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}] });
            }
            aiOutput.classList.remove('empty-state');
            enableLiveCode();
            saveToList('notesHistory', text, data.response);
            loadList('notesHistory', historyList);
            showToast("Complete");
        } catch (error) { showToast("Error: " + error.message); } 
        finally { processBtn.disabled = false; processBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Refine'; }
    });

    // --- UTILS ---
    function enableLiveCode() {
        const codes = aiOutput.querySelectorAll('pre code');
        codes.forEach(block => {
            if(!block.className.includes('language-javascript')) return;
            const pre = block.parentElement;
            if(pre.querySelector('.run-btn')) return; 

            const btn = document.createElement('button');
            btn.className = 'run-btn'; btn.innerHTML = '<i class="fa-solid fa-play"></i> Run';
            pre.appendChild(btn);
            const outputDiv = document.createElement('div');
            outputDiv.className = 'code-output'; outputDiv.innerText = "> Output...";
            pre.after(outputDiv);

            btn.addEventListener('click', () => {
                const code = block.innerText;
                outputDiv.classList.add('show'); 
                const logs = []; const oldLog = console.log; console.log = (...args) => logs.push(args.join(' '));
                try { eval(code); outputDiv.innerText = logs.length > 0 ? logs.join('\n') : "Done"; outputDiv.style.color = "#10b981"; } 
                catch (err) { outputDiv.innerText = "Error: " + err.message; outputDiv.style.color = "#ef4444"; }
                console.log = oldLog;
            });
        });
    }

    // Focus Mode
    focusBtn.addEventListener('click', () => {
        sidebar.classList.add('hidden'); topHeader.classList.add('hidden'); outputPanel.classList.add('hidden');
        workspace.classList.add('zen'); exitFocusBtn.classList.add('show');
    });
    
    exitFocusBtn.addEventListener('click', () => {
        sidebar.classList.remove('hidden'); topHeader.classList.remove('hidden'); outputPanel.classList.remove('hidden');
        workspace.classList.remove('zen'); exitFocusBtn.classList.remove('show');
    });

    // New Note
    newNoteBtn.addEventListener('click', () => {
        userInput.value = ''; aiOutput.innerHTML = `<i class="fa-solid fa-layer-group"></i><p>Result appears here</p>`;
        aiOutput.classList.add('empty-state');
    });

    // Word Count
    userInput.addEventListener('input', (e) => document.getElementById('inputStats').innerText = `${e.target.value.trim().split(/\s+/).length} words`);

    // Helper Functions
    function showToast(msg) { 
        if(!toast) return; toast.innerText = msg; toast.classList.add('show'); 
        setTimeout(() => toast.classList.remove('show'), 2000); 
    }

    function saveToList(k, o, r) { 
        let l = JSON.parse(localStorage.getItem(k)) || []; 
        l.unshift({id:Date.now(), title:o.substring(0,15)+"...", o, r}); 
        localStorage.setItem(k, JSON.stringify(l.slice(0, 15))); 
    }

    function loadList(k, c) {
        if(!c) return; let l = JSON.parse(localStorage.getItem(k)) || []; c.innerHTML = '';
        l.forEach(i => {
            let el = document.createElement('div'); el.className='list-item'; el.innerText=i.title;
            el.onclick = () => { userInput.value=i.o; aiOutput.innerHTML=marked.parse(i.r); aiOutput.classList.remove('empty-state'); enableLiveCode(); };
            c.appendChild(el);
        });
    }
});