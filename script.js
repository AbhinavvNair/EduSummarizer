document.addEventListener('DOMContentLoaded', () => {
    // --- UI ELEMENTS ---
    const userInput = document.getElementById('userInput');
    const aiOutput = document.getElementById('aiOutput');
    const processBtn = document.getElementById('processBtn');
    const copyBtn = document.getElementById('copyBtn');
    const exportBtn = document.getElementById('exportBtn');
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const themeToggle = document.getElementById('themeToggle');
    const toast = document.getElementById('toast');
    const newNoteBtn = document.getElementById('newNoteBtn');

    // Sidebar Toggles
    const historyToggle = document.getElementById('historyToggle');
    const historyList = document.getElementById('historyList');
    const savedToggle = document.getElementById('savedToggle');
    const savedList = document.getElementById('savedList');

    // Settings Modal
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const clearDataBtn = document.getElementById('clearDataBtn');

    // --- INITIALIZATION ---
    loadList('notesHistory', historyList);
    loadList('savedNotes', savedList);
    apiKeyInput.value = localStorage.getItem('geminiApiKey') || '';

    // --- 1. CORE FEATURES ---

    // Process (Refine)
    processBtn.addEventListener('click', async () => {
        const text = userInput.value.trim();
        if (!text) { showToast("Please enter notes first!", true); return; }

        processBtn.disabled = true;
        processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Refining...';
        aiOutput.innerHTML = '<div class="empty-state"><i class="fa-solid fa-microchip"></i><p>Analyzing...</p></div>';

        // Fake Delay (Simulation)
        await new Promise(r => setTimeout(r, 1500));
        const refinedText = generateSmartFakeResponse(text);

        // Render & Save to History
        aiOutput.innerHTML = marked.parse(refinedText);
        aiOutput.classList.remove('empty-state');
        
        // Save the Raw Markdown to History
        saveToList('notesHistory', text, refinedText);
        
        showToast("Refinement Complete!");
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Refine with AI';
        loadList('notesHistory', historyList); // Refresh UI
    });

    // Bookmark (Save Note)
    bookmarkBtn.addEventListener('click', () => {
        const content = aiOutput.innerText;
        const original = userInput.value;
        if (!content || content.includes("Enter your notes")) {
            showToast("Nothing to save yet!", true);
            return;
        }
        
        // For Bookmarks, we save the HTML snapshot so it looks exactly the same when loaded
        saveToList('savedNotes', original, aiOutput.innerHTML, true);
        showToast("Note Saved to Bookmarks!");
        
        // Auto-open Saved list
        savedList.style.display = 'flex';
        loadList('savedNotes', savedList);
    });

    // New Note (Clear)
    newNoteBtn.addEventListener('click', () => {
        userInput.value = '';
        aiOutput.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-arrow-left"></i>
                <p>Enter your notes on the left and click "Refine".</p>
            </div>`;
        aiOutput.classList.add('empty-state');
        showToast("New note started");
    });

    // --- 2. SETTINGS LOGIC ---
    settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));

    saveSettingsBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if(key) {
            localStorage.setItem('geminiApiKey', key);
            showToast("API Key Saved!");
        }
        settingsModal.classList.add('hidden');
    });

    clearDataBtn.addEventListener('click', () => {
        if(confirm("Are you sure? This will delete all History and Saved notes.")) {
            localStorage.removeItem('notesHistory');
            localStorage.removeItem('savedNotes');
            loadList('notesHistory', historyList);
            loadList('savedNotes', savedList);
            settingsModal.classList.add('hidden');
            showToast("All data cleared", true);
        }
    });

    // --- 3. UTILS (Copy, Export, Theme) ---
    copyBtn.addEventListener('click', () => {
        if(aiOutput.innerText) {
            navigator.clipboard.writeText(aiOutput.innerText);
            showToast("Copied to clipboard");
        }
    });

    exportBtn.addEventListener('click', () => {
        const content = aiOutput.innerText;
        if (!content) return;
        const blob = new Blob([content], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "SmartNotes_Export.txt";
        a.click();
        showToast("Downloaded!");
    });

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i> Light Mode' : '<i class="fa-solid fa-moon"></i> Dark Mode';
    });

    // Accordions
    setupAccordion(historyToggle, historyList);
    setupAccordion(savedToggle, savedList);

    function setupAccordion(btn, list) {
        btn.addEventListener('click', () => {
            const isHidden = list.style.display === 'none';
            list.style.display = isHidden ? 'flex' : 'none';
            btn.querySelector('.arrow').style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    }

    // --- 4. DATA HELPERS ---
    
    function saveToList(key, original, refined, isHtml = false) {
        let list = JSON.parse(localStorage.getItem(key)) || [];
        const newItem = {
            id: Date.now(),
            title: original.substring(0, 15) + (original.length > 15 ? "..." : ""),
            original: original,
            refined: refined,
            isHtml: isHtml // Track if we saved raw HTML or Markdown
        };
        list.unshift(newItem);
        if (list.length > 20) list.pop(); 
        localStorage.setItem(key, JSON.stringify(list));
    }

    function loadList(key, container) {
        const list = JSON.parse(localStorage.getItem(key)) || [];
        container.innerHTML = '';
        
        if (list.length === 0) {
            container.innerHTML = '<div class="list-item" style="cursor:default; opacity:0.5;">Empty</div>';
            return;
        }

        list.forEach(item => {
            const div = document.createElement('div');
            div.className = 'list-item';
            const icon = key === 'savedNotes' ? 'fa-bookmark' : 'fa-clock';
            div.innerHTML = `<i class="fa-solid ${icon}"></i> ${item.title}`;
            div.addEventListener('click', () => {
                userInput.value = item.original;
                
                // CRITICAL FIX: Check if it's HTML or Markdown
                if (item.isHtml) {
                    aiOutput.innerHTML = item.refined; // It's HTML, just inject
                } else {
                    aiOutput.innerHTML = marked.parse(item.refined); // It's Markdown, parse it
                }
                
                aiOutput.classList.remove('empty-state');
                showToast("Note Loaded");
            });
            container.appendChild(div);
        });
    }

    function showToast(msg, isError = false) {
        const span = toast.querySelector('span');
        const icon = toast.querySelector('i');
        span.innerText = msg;
        toast.style.background = isError ? "#ef4444" : "#1f2937";
        icon.className = isError ? "fa-solid fa-circle-exclamation" : "fa-solid fa-circle-check";
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function generateSmartFakeResponse(inputText) {
        return `
# 📝 Intelligent Summary
**Topic:** *"${inputText.substring(0, 15)}..."*

### 🔑 Key Takeaways
* **Analysis:** The system processed your input about "${inputText.split(' ')[0] || 'the topic'}".
* **Refinement:** Structure has been improved for readability.

### 📚 Cleaned Notes
> "${inputText}"

### 💻 Code Example
\`\`\`python
def example():
    return "This is a generated code block."
\`\`\`
        `;
    }
});