document.addEventListener('DOMContentLoaded', () => {
    // Initialize Mermaid (Charts)
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });

    // --- DOM ELEMENTS ---
    const userInput = document.getElementById('userInput');
    const aiOutput = document.getElementById('aiOutput');
    const processBtn = document.getElementById('processBtn');
    const newNoteBtn = document.getElementById('newNoteBtn');
    const visualizeBtn = document.getElementById('visualizeBtn');
    const historyList = document.getElementById('historyList');
    const toast = document.getElementById('toast');

    // --- 1. CORE AI LOGIC (Connecting to FastAPI) ---
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
                    max_tokens: 800,
                    temperature: 0.7
                }),
            });

            if (!response.ok) throw new Error("Server error. Is main.py running?");

            const data = await response.json();
            const refined = data.response; 

            // Update UI with Markdown
            aiOutput.innerHTML = marked.parse(refined);
            
            // Render Math (KaTeX)
            if(window.renderMathInElement) {
                renderMathInElement(aiOutput, { 
                    delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}] 
                });
            }
            
            aiOutput.classList.remove('empty-state');
            
            // FIX: Re-enable the missing functions
            enableLiveCode();
            
            saveToList('notesHistory', text, refined);
            loadList('notesHistory', historyList);
            showToast("Groq Refinement Complete");

        } catch (error) {
            console.error("API Error:", error);
            showToast("Error: " + error.message);
        } finally {
            processBtn.disabled = false; 
            processBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Refine';
        }
    });

    // --- 2. LIVE CODE RUNNER (The missing function) ---
    function enableLiveCode() {
        const codes = aiOutput.querySelectorAll('pre code.language-javascript');
        codes.forEach(block => {
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
                outputDiv.innerText = "";
                const oldLog = console.log; 
                const logs = [];
                console.log = (...args) => { logs.push(args.join(' ')); };
                
                try { 
                    eval(code); 
                    outputDiv.innerText = logs.length > 0 ? logs.join('\n') : "Done (No output)"; 
                    outputDiv.style.color = "var(--success)"; 
                } catch (err) { 
                    outputDiv.innerText = "Error: " + err.message; 
                    outputDiv.style.color = "#ef4444"; 
                }
                console.log = oldLog;
            });
        });
    }

    // --- 3. EXPORT & UTILS ---
    window.downloadPDF = () => {
        if (aiOutput.classList.contains('empty-state')) {
            showToast("Nothing to download");
            return;
        }
        const opt = {
            margin: 1,
            filename: 'EduSummary.pdf',
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(aiOutput).save();
        showToast("Downloading PDF...");
    };

    function showToast(msg) { 
        toast.innerText = msg; 
        toast.classList.add('show'); 
        setTimeout(() => toast.classList.remove('show'), 2000); 
    }

    function saveToList(k, o, r) { 
        let l = JSON.parse(localStorage.getItem(k)) || []; 
        l.unshift({id:Date.now(), title:o.substring(0,15)+"...", o, r}); 
        localStorage.setItem(k, JSON.stringify(l)); 
    }

    function loadList(k, c) {
        if(!c) return;
        let l = JSON.parse(localStorage.getItem(k)) || []; 
        c.innerHTML = '';
        l.forEach(i => {
            let el = document.createElement('div'); 
            el.className='list-item'; 
            el.innerText=i.title;
            el.onclick = () => { 
                userInput.value=i.o; 
                aiOutput.innerHTML=marked.parse(i.r); 
                aiOutput.classList.remove('empty-state');
                enableLiveCode();
            };
            c.appendChild(el);
        });
    }

    // Initial Load
    loadList('notesHistory', historyList);
    
    // Set Template Utility
    window.setTemplate = (type) => {
        let txt = "";
        if(type === 'general') txt = "Topic: \n\nKey Points:\n- ";
        if(type === 'flashcard') txt = "Term : Definition";
        if(type === 'code') txt = "```javascript\nconsole.log('Hello World');\n```";
        if(type === 'math') txt = "$$ E = mc^2 $$";
        userInput.value = txt; 
        userInput.focus();
    };
});