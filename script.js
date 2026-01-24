document.addEventListener('DOMContentLoaded', () => {
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });

    // DOM ELEMENTS
    const userInput = document.getElementById('userInput');
    const aiOutput = document.getElementById('aiOutput');
    const newNoteBtn = document.getElementById('newNoteBtn'); // Added selector
    const processBtn = document.getElementById('processBtn');
    const visualizeBtn = document.getElementById('visualizeBtn');
    const studyBtn = document.getElementById('studyBtn'); 
    const focusBtn = document.getElementById('focusBtn'); 
    const exitFocusBtn = document.getElementById('exitFocusBtn'); 
    const toast = document.getElementById('toast');
    
    // Audio Elements
    const playAudioBtn = document.getElementById('playAudioBtn');
    const stopAudioBtn = document.getElementById('stopAudioBtn');
    const speedBtn = document.getElementById('speedBtn');
    
    // Layout Elements
    const sidebar = document.getElementById('sidebar');
    const topHeader = document.getElementById('topHeader');
    const outputPanel = document.getElementById('outputPanel');
    const workspace = document.getElementById('workspace');
    
    // Memory Lists
    const historyList = document.getElementById('historyList');
    const savedList = document.getElementById('savedList');
    loadList('notesHistory', historyList);
    loadList('savedNotes', savedList);

    // --- NEW NOTE LOGIC (The Fix) ---
    newNoteBtn.addEventListener('click', () => {
        // 1. Clear Input
        userInput.value = '';
        
        // 2. Reset Output to Empty State
        aiOutput.innerHTML = `
            <i class="fa-solid fa-layer-group"></i>
            <p>Result appears here</p>
        `;
        aiOutput.classList.add('empty-state');
        
        // 3. Reset Stats
        document.getElementById('inputStats').innerText = "0 words";
        
        // 4. Stop Audio if playing
        window.speechSynthesis.cancel();
        
        showToast("New Note Started");
    });

    // --- AUDIO LOGIC ---
    let speech = new SpeechSynthesisUtterance();
    let isSpeaking = false;
    let speeds = [1, 1.5, 2];
    let speedIndex = 0;

    playAudioBtn.addEventListener('click', () => {
        if(isSpeaking) {
            window.speechSynthesis.pause();
            isSpeaking = false;
            playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        } else {
            let textToRead = window.getSelection().toString() || aiOutput.innerText || userInput.value;
            if(!textToRead.trim()) { showToast("Nothing to read"); return; }
            if(window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            } else {
                window.speechSynthesis.cancel(); 
                speech.text = textToRead;
                speech.rate = speeds[speedIndex];
                window.speechSynthesis.speak(speech);
            }
            isSpeaking = true;
            playAudioBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        }
    });

    stopAudioBtn.addEventListener('click', () => {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    });

    speedBtn.addEventListener('click', () => {
        speedIndex = (speedIndex + 1) % speeds.length;
        let newSpeed = speeds[speedIndex];
        speedBtn.innerText = newSpeed + 'x';
        showToast(`Speed: ${newSpeed}x`);
        if(window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            speech.rate = newSpeed;
            window.speechSynthesis.speak(speech);
        }
    });

    speech.onend = () => {
        isSpeaking = false;
        playAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    };

    // --- FOCUS MODE ---
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

    // --- TEMPLATES ---
    window.setTemplate = (type) => {
        let txt = "";
        if(type === 'general') txt = "Topic: \nDate: \n\nKey Points:\n- ";
        if(type === 'flashcard') txt = "Term : Definition\nQuestion : Answer";
        if(type === 'code') txt = "Language: Python\n\n```python\n\n```";
        userInput.value = txt; userInput.focus();
    };

    // --- REFINE TEXT ---
    processBtn.addEventListener('click', async () => {
        const text = userInput.value.trim();
        if(!text) { showToast("Enter notes first"); return; }
        
        processBtn.disabled = true; processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        await new Promise(r => setTimeout(r, 600)); 
        
        const refined = smartFormat(text);
        aiOutput.innerHTML = marked.parse(refined);
        aiOutput.classList.remove('empty-state');
        saveToList('notesHistory', text, refined);
        loadList('notesHistory', historyList);

        processBtn.disabled = false; processBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Refine';
        showToast("Refined");
    });

    // --- VISUALIZE ---
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

    // --- STUDY MODE ---
    let cards = []; let cardIndex = 0;
    studyBtn.addEventListener('click', () => {
        const text = userInput.value.trim();
        cards = text.split('\n').reduce((acc, l) => {
            if(l.includes(':')) { const [f,b] = l.split(':'); acc.push({front:f.trim(), back:b.trim()}); }
            return acc;
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
    
    function smartFormat(text) { 
        return `# 📝 Refined Notes\n\n${text}`; 
    }

    function showToast(msg) { toast.innerText = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2000); }
    function saveToList(k, o, r) { let l = JSON.parse(localStorage.getItem(k)) || []; l.unshift({id:Date.now(), title:o.substring(0,15)+"...", o, r}); localStorage.setItem(k, JSON.stringify(l)); }
    function loadList(k, c) {
        let l = JSON.parse(localStorage.getItem(k)) || []; c.innerHTML = '';
        l.forEach(i => {
            let el = document.createElement('div'); el.className='list-item'; el.innerText=i.title;
            el.onclick = () => { userInput.value=i.o; aiOutput.innerHTML=marked.parse(i.r); aiOutput.classList.remove('empty-state'); };
            c.appendChild(el);
        });
    }
    const toggle = (id, listId) => document.getElementById(id).addEventListener('click', () => { let el = document.getElementById(listId); el.style.display = el.style.display==='none'?'flex':'none'; });
    toggle('historyToggle', 'historyList'); toggle('savedToggle', 'savedList');
});