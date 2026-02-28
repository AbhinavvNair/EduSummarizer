document.addEventListener('DOMContentLoaded', () => {
    window.speechSynthesis.cancel();
    if (typeof mermaid !== 'undefined') mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });

    // --- HELPER & DOM ---
    const $ = id => document.getElementById(id);
    const toast = $('toast'), userInput = $('userInput'), aiOutput = $('aiOutput');
    const showToast = msg => { toast.innerText = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2000); };
    
    let currentRawResponse = "", historyNotes = [], historyDisplayCount = 10, savedNotesData = [], lastGeneratedNoteId = null;
    let savedPrompt = localStorage.getItem('appPrompt') || 'You are an expert AI tutor. Summarize clearly using clean Markdown.';
    let isReg = false, isResizing = false;

    // --- API & AUTH ---
    const forceLogout = (msg = "Session expired. Please login again.") => {
        localStorage.removeItem("access_token"); sessionStorage.removeItem("access_token");
        $('appContainer').classList.add('hidden'); $('loginScreen').style.display = 'flex';
        userInput.value = ""; aiOutput.innerHTML = '<i class="fa-solid fa-sparkles"></i><p>Ready for refinement</p>'; aiOutput.classList.add('empty-state');
        lastGeneratedNoteId = null; currentRawResponse = ""; showToast(msg);
    };

    const apiFetch = async (url, opts = {}) => {
        const t = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
        if (t) opts.headers = { ...opts.headers, "Authorization": "Bearer " + t };
        const res = await fetch(url, opts);
        if (res.status === 401) { forceLogout(); throw new Error("Unauthorized"); }
        return res;
    };

    const loadNotes = async () => {
        try {
            const res = await apiFetch("http://127.0.0.1:8000/notes");
            if (!res.ok) throw new Error("Fetch failed");
            const notes = await res.json();
            historyNotes = notes.filter(n => !n.is_bookmarked); savedNotesData = notes.filter(n => n.is_bookmarked);
            renderList($('historyList'), historyNotes.slice(0, historyDisplayCount), false);
            renderList($('savedList'), savedNotesData, true);
            if(historyNotes.length > historyDisplayCount) {
                const btn = document.createElement('div'); btn.className = "list-item"; btn.style = "text-align:center; font-weight:600; color:var(--primary);";
                btn.textContent = "Show More"; btn.onclick = () => { historyDisplayCount += 10; loadNotes(); };
                $('historyList').appendChild(btn);
            }
        } catch (e) { console.error(e); }
    };

    const renderList = (container, notes, isSaved) => {
        container.innerHTML = "";
        notes.forEach(note => {
            const wrap = document.createElement('div'); wrap.className = "list-item"; wrap.style.display = "flex"; wrap.style.justifyContent = "space-between";
            const title = document.createElement('span'); title.style.cursor = "pointer"; title.textContent = note.title || note.content.substring(0, 25);
            title.onclick = () => { userInput.value = note.title || ""; aiOutput.innerHTML = marked.parse(note.content); aiOutput.classList.remove("empty-state"); currentRawResponse = note.content; lastGeneratedNoteId = note.id; enableLiveCode(); };
            const btn = document.createElement('button'); btn.className = isSaved ? "hover-action" : "delete-btn hover-action"; btn.style = `background:transparent; border:none; cursor:pointer; color: ${isSaved ? '#818cf8' : '#ef4444'}`;
            btn.innerHTML = isSaved ? `<i class="fa-solid fa-bookmark"></i>` : `<i class="fa-solid fa-xmark"></i>`;
            btn.onclick = async (e) => { e.stopPropagation(); isSaved ? handleBookmark(note.id, true) : showDeleteModal(note.id); };
            wrap.append(title, btn); container.appendChild(wrap);
        });
    };

    (async function validateSession() {
        if (!(localStorage.getItem("access_token") || sessionStorage.getItem("access_token"))) return forceLogout("Please login to continue");
        try {
            const res = await apiFetch("http://127.0.0.1:8000/me"); if (!res.ok) throw new Error();
            const email = (await res.json()).email;
            const nameEl = document.querySelector(".user-info .name"), avEl = document.querySelector(".user-avatar");
            if (nameEl) nameEl.textContent = email.split("@")[0]; if (avEl) avEl.textContent = email.substring(0, 2).toUpperCase();
            $('loginScreen').style.display = 'none'; $('appContainer').classList.remove('hidden'); await loadNotes();
        } catch { forceLogout(); }
    })();

    // --- LOGIN & SETTINGS ---
    $('toggleAuthMode')?.addEventListener('click', () => {
        isReg = !isReg; $('confirmPasswordGroup').classList.toggle('hidden', !isReg); $('loginError').classList.add('hidden');
        $('loginSubmitBtn').innerHTML = isReg ? 'Create Account <i class="fa-solid fa-user-plus"></i>' : 'Enter Workspace <i class="fa-solid fa-arrow-right"></i>';
        $('toggleAuthMode').innerText = isReg ? "Already have an account? Login" : "Don't have an account? Register";
    });

    $('logoutBtn')?.addEventListener('click', () => forceLogout("Logged out"));

    $('loginSubmitBtn')?.addEventListener('click', async () => {
        const email = $('loginUser').value.trim(), pass = $('loginPass').value.trim(), conf = $('confirmPass')?.value.trim();
        if (!email || !pass) return showLoginError("Enter email and password");
        if (isReg && pass !== conf) return showLoginError("Passwords do not match");
        try {
            if (isReg) {
                const r = await fetch("http://127.0.0.1:8000/register", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({email, password: pass}) });
                if (!r.ok) throw new Error((await r.json()).detail || "Registration failed");
                showToast("Account created. Please login."); $('toggleAuthMode').click(); return;
            }
            const fd = new URLSearchParams(); fd.append("username", email); fd.append("password", pass);
            const r = await fetch("http://127.0.0.1:8000/login", { method: "POST", headers: {"Content-Type":"application/x-www-form-urlencoded"}, body: fd });
            if (!r.ok) throw new Error((await r.json()).detail || "Invalid credentials");
            ($('rememberMe')?.checked ? localStorage : sessionStorage).setItem("access_token", (await r.json()).access_token);
            $('loginScreen').style.display = 'none'; $('appContainer').classList.remove('hidden'); await loadNotes();
        } catch (e) { showLoginError(e.message); }
    });
    const showLoginError = msg => { $('loginError').textContent = msg; $('loginError').classList.remove('hidden'); };

    $('settingsBtn')?.addEventListener('click', () => { $('settingPrompt').value = savedPrompt; $('settingsModal').classList.remove('hidden'); setTimeout(()=>$('settingsModal').classList.add('show'), 10); });
    $('closeSettingsBtn')?.addEventListener('click', () => { $('settingsModal').classList.remove('show'); setTimeout(()=>$('settingsModal').classList.add('hidden'), 200); });
    $('saveSettingsBtn')?.addEventListener('click', () => { localStorage.setItem('appPrompt', $('settingPrompt').value.trim()); savedPrompt = localStorage.getItem('appPrompt'); showToast("Preferences Saved!"); $('closeSettingsBtn').click(); });

    $('changePasswordBtn')?.addEventListener('click', async () => {
        const old_p = $('currentPassword').value.trim(), new_p = $('newPassword').value.trim(), conf_p = $('confirmNewPassword').value.trim();
        if (!old_p || !new_p) return showToast("Fill all fields"); if (new_p !== conf_p) return showToast("Passwords don't match");
        try {
            const r = await apiFetch("http://127.0.0.1:8000/change-password", { method: "POST", body: JSON.stringify({old_password: old_p, new_password: new_p}) });
            if (!r.ok) throw new Error("Incorrect current password");
            showToast("Password updated"); $('currentPassword').value = $('newPassword').value = $('confirmNewPassword').value = "";
        } catch (e) { showToast(e.message); }
    });

    // --- SIDEBAR & THEMES ---
    const themes = ['nebula', 'light', 'midnight', 'terminal', 'sunset'];
    const applyTheme = idx => { document.documentElement.removeAttribute('data-theme'); if (idx > 0) document.documentElement.setAttribute('data-theme', themes[idx]); localStorage.setItem('themeIndex', idx); };
    applyTheme(parseInt(localStorage.getItem('themeIndex')) || 0);
    document.querySelectorAll('.theme-option').forEach(opt => opt.addEventListener('click', () => { applyTheme(opt.dataset.idx); showToast("Theme updated"); }));

    const toggleList = (listId, btnId) => {
        const list = $(listId), isHidden = list.style.display === 'none';
        list.style.display = isHidden ? 'flex' : 'none'; $(btnId).classList.toggle('active', isHidden);
    };
    $('historyToggle')?.addEventListener('click', () => toggleList('historyList', 'historyToggle'));
    $('savedToggle')?.addEventListener('click', () => toggleList('savedList', 'savedToggle'));

    $('clearHistoryBtn')?.addEventListener("click", async () => {
        if (!confirm("Clear all history?")) return;
        try { for (const n of historyNotes) await apiFetch(`http://127.0.0.1:8000/notes/${n.id}`, { method: "DELETE" }); await loadNotes(); showToast("History cleared"); } catch { showToast("Error clearing history"); }
    });

    const handleBookmark = async (id, isRemoving = false) => {
        if(!id) return showToast("No note selected");
        try { const r = await apiFetch(`http://127.0.0.1:8000/notes/${id}/bookmark`, { method: "PATCH" }); if(!r.ok) throw new Error(); await loadNotes(); showToast(isRemoving ? "Removed bookmark" : "Saved note"); } catch { showToast("Bookmark failed"); }
    };
    $('saveNoteBtn')?.addEventListener('click', () => handleBookmark(lastGeneratedNoteId));
    
    const showDeleteModal = async (id) => { if (confirm("Delete this note?")) { try { await apiFetch(`http://127.0.0.1:8000/notes/${id}`, { method: "DELETE" }); await loadNotes(); showToast("Note deleted"); } catch { showToast("Delete failed"); } } };

    // ==========================================
    // TYPEWRITER STREAMING ENGINE
    // ==========================================
    const streamText = async (container, rawText, onFinish) => {
        container.classList.remove('empty-state');
        container.classList.add('typing-cursor');
        let i = 0, buffer = '';
        return new Promise(resolve => {
            const timer = setInterval(() => {
                buffer += rawText.substring(i, i + 3); 
                i += 3;
                container.innerHTML = marked.parse(buffer);
                container.scrollTop = container.scrollHeight; 
                
                if (i >= rawText.length) {
                    clearInterval(timer); 
                    container.innerHTML = marked.parse(rawText); 
                    container.classList.remove('typing-cursor');
                    if(onFinish) onFinish(); 
                    resolve();
                }
            }, 10); 
        });
    };

    // --- CORE AI ENGINE ---
    $('processBtn')?.addEventListener('click', async () => {
        const text = userInput.value.trim(); if (!text) return showToast("Enter notes first");
        const btn = $('processBtn'); btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Thinking...';
        
        try {
            const res = await apiFetch("http://127.0.0.1:8000/generate", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({prompt: text}) });
            if (!res.ok) throw new Error("Backend Error");
            const data = await res.json();
            
            currentRawResponse = data.response; lastGeneratedNoteId = data.note_id;
            
            await streamText(aiOutput, data.response, () => {
                if (window.renderMathInElement) renderMathInElement(aiOutput, { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }] });
                enableLiveCode();
            });
            
            await loadNotes(); showToast("Complete");
        } catch (e) { showToast(e.message); } finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Refine'; }
    });

    $('newNoteBtn')?.addEventListener('click', () => { userInput.value = ''; aiOutput.innerHTML = '<i class="fa-solid fa-layer-group"></i><p>Ready</p>'; aiOutput.classList.add('empty-state'); currentRawResponse = ""; lastGeneratedNoteId = null; });
    userInput.addEventListener('input', e => $('inputStats').innerText = e.target.value.trim().split(/\s+/).filter(x=>x).length + ' words');

    // --- INSTA-CODE & SNAPSHOT ---
    function enableLiveCode() {
        aiOutput.querySelectorAll('pre code').forEach(block => {
            const pre = block.parentElement; if (pre.classList.contains('processed')) return; pre.classList.add('processed'); pre.style.position = 'relative';
            const head = document.createElement('div'); head.className = 'code-header'; head.innerHTML = `<div class="window-dots"><span></span><span></span><span></span></div>`;
            const actions = document.createElement('div'); actions.className = 'code-actions';
            const copyBtn = document.createElement('button'); copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>'; copyBtn.onclick = () => { navigator.clipboard.writeText(block.innerText); showToast("Copied!"); };
            const snapBtn = document.createElement('button'); snapBtn.innerHTML = '<i class="fa-solid fa-camera"></i>'; snapBtn.onclick = () => {
                showToast("Snapping..."); const c = pre.cloneNode(true); c.style = "width:800px; padding:40px; background:linear-gradient(135deg,#1e293b,#0f172a); border-radius:20px; position:fixed; top:-999px;";
                c.querySelector('.code-actions')?.remove(); document.body.appendChild(c);
                html2canvas(c, { backgroundColor: null, scale: 2 }).then(canvas => { const a = document.createElement('a'); a.download = 'code.png'; a.href = canvas.toDataURL(); a.click(); c.remove(); showToast("Saved! 📸"); });
            };
            actions.append(copyBtn, snapBtn);
            if (block.className.includes('js')) { const runBtn = document.createElement('button'); runBtn.className = 'run-btn-small'; runBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run'; runBtn.onclick = () => executeCode(block, pre); actions.append(runBtn); }
            head.appendChild(actions); pre.insertBefore(head, block);
        });
    }
    const executeCode = (block, pre) => { pre.nextElementSibling?.classList.contains('code-output') && pre.nextElementSibling.remove(); const out = document.createElement('div'); out.className = 'code-output show'; try { const logs = []; const oLog = console.log; console.log = (...a) => logs.push(a.join(' ')); eval(block.innerText); out.innerText = logs.length ? logs.join('\n') : "> Executed"; out.style.color = "#10b981"; console.log = oLog; } catch(e) { out.innerText = "Error: " + e.message; out.style.color = "#ef4444"; } pre.after(out); };

    // --- AUDIO, NOISE & GOD MODE ---
    let speechParams = { speeds: [1, 1.5, 2], index: 0, utterance: null };
    const populateVoices = () => {
        const v = window.speechSynthesis.getVoices(); if(!v.length) return setTimeout(populateVoices, 200); if(!$('voiceSelect')) return; $('voiceSelect').innerHTML = '';
        v.slice(0, 10).forEach(voice => { const opt = document.createElement('option'); opt.value = voice.name; opt.textContent = voice.name.substring(0,25); $('voiceSelect').appendChild(opt); });
    };
    populateVoices(); window.speechSynthesis.onvoiceschanged = populateVoices;

    $('playAudioBtn')?.addEventListener('click', () => {
        if(speechSynthesis.paused) { speechSynthesis.resume(); $('playAudioBtn').innerHTML = '<i class="fa-solid fa-pause"></i>'; return; }
        if(speechSynthesis.speaking) { speechSynthesis.pause(); $('playAudioBtn').innerHTML = '<i class="fa-solid fa-play"></i>'; return; }
        const t = window.getSelection().toString() || aiOutput.innerText || userInput.value; if(!t || t.includes("Ready")) return;
        speechSynthesis.cancel(); speechParams.utterance = new SpeechSynthesisUtterance(t);
        const selVoice = window.speechSynthesis.getVoices().find(v => v.name === $('voiceSelect').value); if(selVoice) speechParams.utterance.voice = selVoice;
        speechParams.utterance.rate = speechParams.speeds[speechParams.index];
        speechParams.utterance.onend = () => $('playAudioBtn').innerHTML = '<i class="fa-solid fa-play"></i>';
        speechSynthesis.speak(speechParams.utterance); $('playAudioBtn').innerHTML = '<i class="fa-solid fa-pause"></i>';
    });
    $('stopAudioBtn')?.addEventListener('click', () => { speechSynthesis.cancel(); $('playAudioBtn').innerHTML = '<i class="fa-solid fa-play"></i>'; });
    $('speedBtn')?.addEventListener('click', () => { speechParams.index = (speechParams.index + 1) % speechParams.speeds.length; $('speedBtn').innerText = speechParams.speeds[speechParams.index] + 'x'; });

    let audioCtx, noiseSrc;
    $('focusSoundBtn')?.addEventListener('click', () => {
        if(noiseSrc) { noiseSrc.stop(); noiseSrc = null; $('focusSoundBtn').classList.remove('active'); showToast("Focus: OFF"); return; }
        if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate*2, audioCtx.sampleRate), data = buf.getChannelData(0); let last = 0;
        for(let i=0; i<buf.length; i++) { const w = Math.random()*2-1; last = (last + (0.02 * w)) / 1.02; data[i] = last * 3.5; }
        noiseSrc = audioCtx.createBufferSource(); noiseSrc.buffer = buf; noiseSrc.loop = true;
        const gain = audioCtx.createGain(); gain.gain.value = 0.05; noiseSrc.connect(gain); gain.connect(audioCtx.destination);
        noiseSrc.start(); $('focusSoundBtn').classList.add('active'); showToast("Focus: ON");
    });

    $('pdfBtn')?.addEventListener('click', () => { if(!aiOutput.innerText) return; showToast("Generating PDF..."); html2pdf().from(aiOutput).save('note.pdf'); });

    // IDE Splitter
    $('resizeHandler')?.addEventListener('mousedown', () => { isResizing = true; document.body.classList.add('resizing'); $('resizeHandler').classList.add('active'); });
    document.addEventListener('mousemove', e => { if(!isResizing) return; const r = $('workspace').getBoundingClientRect(); let w = ((e.clientX - r.left)/r.width)*100; $('inputPanel').style.flex = `0 0 calc(${Math.max(20, Math.min(w, 80))}% - 8px)`; });
    document.addEventListener('mouseup', () => { isResizing = false; document.body.classList.remove('resizing'); $('resizeHandler')?.classList.remove('active'); });

    // --- FLOATING HIGHLIGHT MENU ---
    const floatingMenu = $('floatingMenu');
    let selectedTextForMenu = "";

    userInput.addEventListener('mouseup', (e) => {
        selectedTextForMenu = userInput.value.substring(userInput.selectionStart, userInput.selectionEnd).trim();
        if (selectedTextForMenu.length > 0) {
            floatingMenu.style.left = `${e.pageX - 80}px`; floatingMenu.style.top = `${e.pageY - 50}px`;
            floatingMenu.classList.remove('hidden'); setTimeout(() => floatingMenu.classList.add('show'), 10);
        } else hideFloatingMenu();
    });

    const hideFloatingMenu = () => { floatingMenu.classList.remove('show'); setTimeout(() => floatingMenu.classList.add('hidden'), 200); };
    document.addEventListener('mousedown', (e) => { if (!floatingMenu.contains(e.target) && e.target !== userInput) hideFloatingMenu(); });
    userInput.addEventListener('keydown', hideFloatingMenu);

    document.querySelectorAll('.float-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault(); const action = btn.dataset.action; hideFloatingMenu();
            
            if (action === 'read') {
                speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(selectedTextForMenu);
                const selVoice = window.speechSynthesis.getVoices().find(v => v.name === $('voiceSelect').value); if(selVoice) utterance.voice = selVoice;
                speechSynthesis.speak(utterance); return;
            }

            const processBtnOrig = $('processBtn').innerHTML;
            $('processBtn').disabled = true; $('processBtn').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Working...';
            
            let systemPromptAddon = "";
            if (action === 'rewrite') systemPromptAddon = "Rewrite the following text to be more clear, professional, and engaging. Return ONLY the rewritten text.";
            if (action === 'summarize') systemPromptAddon = "Summarize the following text concisely in bullet points.";
            if (action === 'explain') systemPromptAddon = "Explain the following code or concept step-by-step so a beginner can understand.";

            try {
                const res = await apiFetch("http://127.0.0.1:8000/generate", { 
                    method: "POST", headers: {"Content-Type":"application/json"}, 
                    body: JSON.stringify({ prompt: `Instruction: ${systemPromptAddon}\n\nText:\n${selectedTextForMenu}` }) 
                });
                if (!res.ok) throw new Error("Backend Error");
                const data = await res.json();
                
                currentRawResponse = data.response; lastGeneratedNoteId = data.note_id;
                
                await streamText(aiOutput, data.response, () => {
                    if (window.renderMathInElement) renderMathInElement(aiOutput, { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }] });
                    enableLiveCode();
                });
                
                await loadNotes(); showToast(action.charAt(0).toUpperCase() + action.slice(1) + " Complete!");
            } catch (err) { showToast(err.message); } 
            finally { $('processBtn').disabled = false; $('processBtn').innerHTML = processBtnOrig; }
        });
    });

    // ==========================================
    // 14. CONTEXTUAL AI CHAT SIDEBAR
    // ==========================================
    const chatSidebar = $('chatSidebar'), chatInput = $('chatInput'), chatMessages = $('chatMessages');
    
    // Toggle Sidebar & Shrink Workspace
    const toggleChat = () => { 
        chatSidebar.classList.toggle('open'); 
        $('workspace').classList.toggle('chat-open'); // <-- NEW LINE ADDED HERE
        if(chatSidebar.classList.contains('open')) chatInput.focus(); 
    };
    $('chatToggleBtn')?.addEventListener('click', toggleChat);
    $('closeChatBtn')?.addEventListener('click', toggleChat);

    const appendMsg = (text, sender) => {
        const div = document.createElement('div'); div.className = `chat-msg ${sender}`;
        div.innerHTML = sender === 'ai' ? marked.parse(text) : text; 
        chatMessages.appendChild(div); chatMessages.scrollTop = chatMessages.scrollHeight;
        return div; 
    };

    const handleChatSend = async () => {
        const msg = chatInput.value.trim(); if(!msg) return;
        appendMsg(msg, 'user'); chatInput.value = '';
        
        const contextText = aiOutput.innerText.includes('Ready for refinement') ? userInput.value : aiOutput.innerText;
        
        if(!contextText.trim() || contextText.includes('Ready for refinement')) {
            setTimeout(() => appendMsg("Please paste some text or generate a note first so I know what we are talking about!", 'ai'), 400);
            return;
        }

        const aiDiv = appendMsg("", 'ai');
        aiDiv.classList.add('typing-cursor');
        aiDiv.innerHTML = "Thinking...";

        try {
            const chatPrompt = `You are a helpful study assistant. Use the provided Context to answer the User's Question. Keep your answer concise, conversational, and format it nicely in markdown.\n\nContext:\n${contextText.substring(0, 3000)}\n\nUser Question:\n${msg}`;
            
            const res = await apiFetch("http://127.0.0.1:8000/generate", { 
                method: "POST", headers: {"Content-Type":"application/json"}, 
                body: JSON.stringify({ prompt: chatPrompt, temperature: 0.3 }) 
            });
            
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            
            aiDiv.innerHTML = "";
            await streamText(aiDiv, data.response);
            
        } catch (err) {
            aiDiv.innerHTML = "Error: " + err.message; 
            aiDiv.classList.remove('typing-cursor');
        }
    };

    $('sendChatBtn')?.addEventListener('click', handleChatSend);
    chatInput?.addEventListener('keydown', (e) => { if(e.key === 'Enter') handleChatSend(); });
});