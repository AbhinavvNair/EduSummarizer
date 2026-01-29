document.addEventListener('DOMContentLoaded', () => {
    // Initialize Mermaid (Charts)
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });

    // --- DOM ELEMENTS ---
    const userInput = document.getElementById('userInput');
    const aiOutput = document.getElementById('aiOutput');
    const processBtn = document.getElementById('processBtn');
    const historyList = document.getElementById('historyList');
    const toast = document.getElementById('toast');

    // --- 1. CORE AI LOGIC ---
    processBtn.addEventListener('click', async () => {
        const text = userInput.value.trim();
        if(!text) { showToast("Enter notes first"); return; }
        
        processBtn.disabled = true; 
        processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Grok is thinking...';
        
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

            if (!response.ok) throw new Error("Backend server error. Ensure main.py is running.");

            const data = await response.json();
            const refined = data.response; 

            // Render Markdown
            aiOutput.innerHTML = marked.parse(refined);
            
            // Render Math (KaTeX)
            if(window.renderMathInElement) {
                renderMathInElement(aiOutput, { 
                    delimiters: [
                        {left: "$$", right: "$$", display: true}, 
                        {left: "$", right: "$", display: false}
                    ],
                    throwOnError: false
                });
            }
            
            aiOutput.classList.remove('empty-state');
            enableLiveCode(); // Attach run buttons to any JS blocks
            
            saveToList('notesHistory', text, refined);
            loadList('notesHistory', historyList);
            showToast("Grok Refinement Complete");

        } catch (error) {
            console.error("API Error:", error);
            showToast("Error: " + error.message);
        } finally {
            processBtn.disabled = false; 
            processBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Refine';
        }
    });

    // --- 2. LIVE CODE RUNNER ---
    function enableLiveCode() {
        // Look for all code blocks
        const codes = aiOutput.querySelectorAll('pre code');
        codes.forEach(block => {
            // Only add run button if it's JS and doesn't already have one
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
                outputDiv.innerText = "Running...";
                
                const oldLog = console.log; 
                const logs = [];
                console.log = (...args) => { logs.push(args.join(' ')); };
                
                try { 
                    eval(code); 
                    outputDiv.innerText = logs.length > 0 ? logs.join('\n') : "Executed successfully (No output)"; 
                    outputDiv.style.color = "#10b981"; // success color
                } catch (err) { 
                    outputDiv.innerText = "Error: " + err.message; 
                    outputDiv.style.color = "#ef4444"; // error color
                }
                console.log = oldLog;
            });
        });
    }

    // --- 3. UTILS & EXPORT ---
    window.downloadPDF = () => {
        if (aiOutput.classList.contains('empty-state')) {
            showToast("Nothing to download");
            return;
        }
        const opt = {
            margin: 0.5,
            filename: 'EduSummary.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(aiOutput).save();
    };

    function showToast(msg) { 
        toast.innerText = msg; 
        toast.classList.add('show'); 
        setTimeout(() => toast.classList.remove('show'), 3000); 
    }

    function saveToList(k, o, r) { 
        let l = JSON.parse(localStorage.getItem(k)) || []; 
        l.unshift({id: Date.now(), title: o.substring(0, 20) + "...", o, r}); 
        localStorage.setItem(k, JSON.stringify(l.slice(0, 10))); // Keep last 10
    }

    function loadList(k, c) {
        if(!c) return;
        let l = JSON.parse(localStorage.getItem(k)) || []; 
        c.innerHTML = '';
        l.forEach(i => {
            let el = document.createElement('div'); 
            el.className = 'list-item'; 
            el.innerText = i.title;
            el.onclick = () => { 
                userInput.value = i.o; 
                aiOutput.innerHTML = marked.parse(i.r); 
                aiOutput.classList.remove('empty-state');
                enableLiveCode();
            };
            c.appendChild(el);
        });
    }

    // Initial load of history
    loadList('notesHistory', historyList);
    
    // Global template helper
    window.setTemplate = (type) => {
        const templates = {
            general: "Topic: \n\nKey Points:\n- ",
            flashcard: "Term : Definition",
            code: "```javascript\n// Write code here\nconsole.log('Test');\n```",
            math: "Solve this: $$ x^2 + y^2 = r^2 $$"
        };
        userInput.value = templates[type] || ""; 
        userInput.focus();
    };
});