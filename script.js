document.addEventListener('DOMContentLoaded', () => {
    window.speechSynthesis.cancel();
    if (typeof mermaid !== 'undefined') mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });

    // --- HELPER & DOM ---
    const $ = id => document.getElementById(id);
    const toast = $('toast'), userInput = $('userInput'), aiOutput = $('aiOutput');
    const showToast = msg => { toast.innerText = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2000); };

    // FIX 1: Single API base URL constant
    const API_BASE = "http://127.0.0.1:8000";

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
            const res = await apiFetch(`${API_BASE}/notes`);
            if (!res.ok) throw new Error("Fetch failed");
            const notes = await res.json();
            historyNotes = notes.filter(n => !n.is_bookmarked); savedNotesData = notes.filter(n => n.is_bookmarked);
            renderList($('historyList'), historyNotes.slice(0, historyDisplayCount), false);
            renderList($('savedList'), savedNotesData, true);
            if (historyNotes.length > historyDisplayCount) {
                const btn = document.createElement('div'); btn.className = "list-item"; btn.style = "text-align:center; font-weight:600; color:var(--primary);";
                btn.textContent = "Show More"; btn.onclick = () => { historyDisplayCount += 10; loadNotes(); };
                $('historyList').appendChild(btn);
            }
        } catch (e) {
            // FIX 10: Show toast on notes load failure instead of silent console.error
            console.error(e);
            showToast("Could not load notes. Check your connection.");
        }
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
            const res = await apiFetch(`${API_BASE}/me`); if (!res.ok) throw new Error();
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
    const userSection = $('userSection');
    $('userToggleBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        userSection?.classList.toggle('open');
    });
    document.addEventListener('click', () => userSection?.classList.remove('open'));

    $('loginSubmitBtn')?.addEventListener('click', async () => {
        const email = $('loginUser').value.trim(), pass = $('loginPass').value.trim(), conf = $('confirmPass')?.value.trim();
        if (!email || !pass) return showLoginError("Enter email and password");
        if (isReg && pass !== conf) return showLoginError("Passwords do not match");
        try {
            if (isReg) {
                const r = await fetch(`${API_BASE}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pass }) });
                if (!r.ok) throw new Error((await r.json()).detail || "Registration failed");
                showToast("Account created. Please login."); $('toggleAuthMode').click(); return;
            }
            const fd = new URLSearchParams(); fd.append("username", email); fd.append("password", pass);
            const r = await fetch(`${API_BASE}/login`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: fd });
            if (!r.ok) throw new Error((await r.json()).detail || "Invalid credentials");
            ($('rememberMe')?.checked ? localStorage : sessionStorage).setItem("access_token", (await r.json()).access_token);
            $('loginScreen').style.display = 'none'; $('appContainer').classList.remove('hidden'); await loadNotes();
        } catch (e) { showLoginError(e.message); }
    });
    const showLoginError = msg => { $('loginError').textContent = msg; $('loginError').classList.remove('hidden'); };

    $('settingsBtn')?.addEventListener('click', () => { $('settingPrompt').value = savedPrompt; $('settingsModal').classList.remove('hidden'); setTimeout(() => $('settingsModal').classList.add('show'), 10); });
    $('closeSettingsBtn')?.addEventListener('click', () => { $('settingsModal').classList.remove('show'); setTimeout(() => $('settingsModal').classList.add('hidden'), 200); });
    $('saveSettingsBtn')?.addEventListener('click', () => { localStorage.setItem('appPrompt', $('settingPrompt').value.trim()); savedPrompt = localStorage.getItem('appPrompt'); showToast("Preferences Saved!"); $('closeSettingsBtn').click(); });

    // FIX 2: Added "Content-Type": "application/json" header which was missing from this POST call
    $('changePasswordBtn')?.addEventListener('click', async () => {
        const old_p = $('currentPassword').value.trim(), new_p = $('newPassword').value.trim(), conf_p = $('confirmNewPassword').value.trim();
        if (!old_p || !new_p) return showToast("Fill all fields"); if (new_p !== conf_p) return showToast("Passwords don't match");
        try {
            const r = await apiFetch(`${API_BASE}/change-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ old_password: old_p, new_password: new_p }) });
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

    // FIX 8: Use Promise.all to delete notes in parallel instead of sequential await in a loop
    $('clearHistoryBtn')?.addEventListener("click", async () => {
        if (!confirm("Clear all history?")) return;
        try {
            await Promise.all(historyNotes.map(n => apiFetch(`${API_BASE}/notes/${n.id}`, { method: "DELETE" })));
            await loadNotes(); showToast("History cleared");
        } catch { showToast("Error clearing history"); }
    });

    const handleBookmark = async (id, isRemoving = false) => {
        if (!id) return showToast("No note selected");
        try { const r = await apiFetch(`${API_BASE}/notes/${id}/bookmark`, { method: "PATCH" }); if (!r.ok) throw new Error(); await loadNotes(); showToast(isRemoving ? "Removed bookmark" : "Saved note"); } catch { showToast("Bookmark failed"); }
    };
    $('saveNoteBtn')?.addEventListener('click', () => handleBookmark(lastGeneratedNoteId));
    $('copyBtn')?.addEventListener('click', () => {
        if (!currentRawResponse) return showToast("Nothing to copy");
        navigator.clipboard.writeText(currentRawResponse);
        showToast("Copied!");
    });

    const showDeleteModal = async (id) => { if (confirm("Delete this note?")) { try { await apiFetch(`${API_BASE}/notes/${id}`, { method: "DELETE" }); await loadNotes(); showToast("Note deleted"); } catch { showToast("Delete failed"); } } };

    // ==========================================
    // TYPEWRITER STREAMING ENGINE
    // FIX 5: Increased chunk size to 8 chars and interval to 16ms (one frame)
    //         to reduce how often marked.parse is called during streaming
    // ==========================================
    const streamText = async (container, rawText, onFinish) => {
        container.classList.remove('empty-state');
        container.classList.add('typing-cursor');
        let i = 0, buffer = '';
        return new Promise(resolve => {
            const timer = setInterval(() => {
                buffer += rawText.substring(i, i + 8);
                i += 8;
                container.innerHTML = marked.parse(buffer);
                container.scrollTop = container.scrollHeight;

                if (i >= rawText.length) {
                    clearInterval(timer);
                    container.innerHTML = marked.parse(rawText);
                    container.classList.remove('typing-cursor');
                    if (onFinish) onFinish();
                    resolve();
                }
            }, 16);
        });
    };

    // --- CORE AI ENGINE ---
    $('processBtn')?.addEventListener('click', async () => {
        const text = userInput.value.trim(); if (!text) return showToast("Enter notes first");
        const btn = $('processBtn'); btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Thinking...';

        try {
            const res = await apiFetch(`${API_BASE}/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: text }) });
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

    // FIX 9: Added value check before split to avoid returning 1 for empty string
    userInput.addEventListener('input', e => {
        const val = e.target.value.trim();
        $('inputStats').innerText = (val === '' ? 0 : val.split(/\s+/).filter(x => x).length) + ' words';
    });

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

    // FIX 3: Wrap eval in an iframe sandbox to prevent scope pollution.
    //         console.log is now safely captured and always restored even on error.
    const executeCode = (block, pre) => {
        pre.nextElementSibling?.classList.contains('code-output') && pre.nextElementSibling.remove();
        const out = document.createElement('div'); out.className = 'code-output show';
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        try {
            const logs = [];
            iframe.contentWindow.console = {
                log: (...a) => logs.push(a.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')),
                error: (...a) => logs.push('Error: ' + a.join(' ')),
                warn: (...a) => logs.push('Warn: ' + a.join(' ')),
            };
            iframe.contentWindow.eval(block.innerText);
            out.innerText = logs.length ? logs.join('\n') : "> Executed";
            out.style.color = "#10b981";
        } catch (e) {
            out.innerText = "Error: " + e.message;
            out.style.color = "#ef4444";
        } finally {
            document.body.removeChild(iframe);
        }
        pre.after(out);
    };

    // --- AUDIO, NOISE & GOD MODE ---
    let speechParams = { speeds: [1, 1.5, 2], index: 0, utterance: null };
    const populateVoices = () => {
        const v = window.speechSynthesis.getVoices(); if (!v.length) return setTimeout(populateVoices, 200); if (!$('voiceSelect')) return; $('voiceSelect').innerHTML = '';
        v.slice(0, 10).forEach(voice => { const opt = document.createElement('option'); opt.value = voice.name; opt.textContent = voice.name.substring(0, 25); $('voiceSelect').appendChild(opt); });
    };
    populateVoices(); window.speechSynthesis.onvoiceschanged = populateVoices;

    $('playAudioBtn')?.addEventListener('click', () => {
        if (speechSynthesis.paused) { speechSynthesis.resume(); $('playAudioBtn').innerHTML = '<i class="fa-solid fa-pause"></i>'; return; }
        if (speechSynthesis.speaking) { speechSynthesis.pause(); $('playAudioBtn').innerHTML = '<i class="fa-solid fa-play"></i>'; return; }
        const t = window.getSelection().toString() || aiOutput.innerText || userInput.value; if (!t || t.includes("Ready")) return;
        speechSynthesis.cancel(); speechParams.utterance = new SpeechSynthesisUtterance(t);
        const selVoice = window.speechSynthesis.getVoices().find(v => v.name === $('voiceSelect').value); if (selVoice) speechParams.utterance.voice = selVoice;
        speechParams.utterance.rate = speechParams.speeds[speechParams.index];
        speechParams.utterance.onend = () => $('playAudioBtn').innerHTML = '<i class="fa-solid fa-play"></i>';
        speechSynthesis.speak(speechParams.utterance); $('playAudioBtn').innerHTML = '<i class="fa-solid fa-pause"></i>';
    });
    $('stopAudioBtn')?.addEventListener('click', () => { speechSynthesis.cancel(); $('playAudioBtn').innerHTML = '<i class="fa-solid fa-play"></i>'; });
    $('speedBtn')?.addEventListener('click', () => { speechParams.index = (speechParams.index + 1) % speechParams.speeds.length; $('speedBtn').innerText = speechParams.speeds[speechParams.index] + 'x'; });

    $('focusBtn')?.addEventListener('click', () => { $('inputPanel').classList.add('hidden'); $('resizeHandler').classList.add('hidden'); $('outputPanel').classList.add('focus-mode'); $('workspace').classList.add('focus-active'); $('exitFocusBtn').classList.remove('hidden'); $('exitFocusBtn').classList.add('show'); });
    const exitFocus = () => { $('inputPanel').classList.remove('hidden'); $('resizeHandler').classList.remove('hidden'); $('outputPanel').classList.remove('focus-mode'); $('workspace').classList.remove('focus-active'); $('exitFocusBtn').classList.remove('show'); $('exitFocusBtn').classList.add('hidden'); };
    $('exitFocusBtn')?.addEventListener('click', exitFocus);
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        exitFocus();
        if (!$('settingsModal').classList.contains('hidden')) $('closeSettingsBtn').click();
        if (!$('cmdPalette').classList.contains('hidden')) { $('cmdPalette').classList.remove('show'); setTimeout(() => $('cmdPalette').classList.add('hidden'), 200); }
        if (chatSidebar.classList.contains('open')) toggleChat();
        if ($('confirmOverlay').classList.contains('show')) { $('confirmOverlay').classList.remove('show'); }
        const lightbox = document.getElementById('imageLightbox');
        if (lightbox) lightbox.remove();
    });
    let audioCtx, noiseSrc;
    $('focusSoundBtn')?.addEventListener('click', () => {
        if (noiseSrc) { noiseSrc.stop(); noiseSrc = null; $('focusSoundBtn').classList.remove('active'); showToast("Focus: OFF"); return; }
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate), data = buf.getChannelData(0); let last = 0;
        for (let i = 0; i < buf.length; i++) { const w = Math.random() * 2 - 1; last = (last + (0.02 * w)) / 1.02; data[i] = last * 3.5; }
        noiseSrc = audioCtx.createBufferSource(); noiseSrc.buffer = buf; noiseSrc.loop = true;
        const gain = audioCtx.createGain(); gain.gain.value = 0.05; noiseSrc.connect(gain); gain.connect(audioCtx.destination);
        noiseSrc.start(); $('focusSoundBtn').classList.add('active'); showToast("Focus: ON");
    });

    $('pdfBtn')?.addEventListener('click', () => { if (!aiOutput.innerText) return; showToast("Generating PDF..."); html2pdf().from(aiOutput).save('note.pdf'); });

    // IDE Splitter
    $('resizeHandler')?.addEventListener('mousedown', () => { isResizing = true; document.body.classList.add('resizing'); $('resizeHandler').classList.add('active'); });
    document.addEventListener('mousemove', e => { if (!isResizing) return; const r = $('workspace').getBoundingClientRect(); let w = ((e.clientX - r.left) / r.width) * 100; $('inputPanel').style.flex = `0 0 calc(${Math.max(20, Math.min(w, 80))}% - 8px)`; });
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
                const selVoice = window.speechSynthesis.getVoices().find(v => v.name === $('voiceSelect').value); if (selVoice) utterance.voice = selVoice;
                speechSynthesis.speak(utterance); return;
            }

            const processBtnOrig = $('processBtn').innerHTML;
            $('processBtn').disabled = true; $('processBtn').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Working...';

            let systemPromptAddon = "";
            if (action === 'rewrite') systemPromptAddon = "Rewrite the following text to be more clear, professional, and engaging. Return ONLY the rewritten text.";
            if (action === 'summarize') systemPromptAddon = "Summarize the following text concisely in bullet points.";
            if (action === 'explain') systemPromptAddon = "Explain the following code or concept step-by-step so a beginner can understand.";

            try {
                const res = await apiFetch(`${API_BASE}/generate`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
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
    // CONTEXTUAL AI CHAT SIDEBAR
    // ==========================================
    const chatSidebar = $('chatSidebar'), chatInput = $('chatInput'), chatMessages = $('chatMessages');

    const toggleChat = () => {
        chatSidebar.classList.toggle('open');
        $('workspace').classList.toggle('chat-open');
        if (chatSidebar.classList.contains('open')) chatInput.focus();
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
        const msg = chatInput.value.trim(); if (!msg) return;
        appendMsg(msg, 'user'); chatInput.value = '';

        const contextText = aiOutput.innerText.includes('Ready for refinement') ? userInput.value : aiOutput.innerText;

        if (!contextText.trim() || contextText.includes('Ready for refinement')) {
            setTimeout(() => appendMsg("Please paste some text or generate a note first so I know what we are talking about!", 'ai'), 400);
            return;
        }

        const aiDiv = appendMsg("", 'ai');
        aiDiv.classList.add('typing-cursor');
        aiDiv.innerHTML = "Thinking...";

        try {
            const chatPrompt = `You are a helpful study assistant. Use the provided Context to answer the User's Question. Keep your answer concise, conversational, and format it nicely in markdown.\n\nContext:\n${contextText.substring(0, 3000)}\n\nUser Question:\n${msg}`;

            const res = await apiFetch(`${API_BASE}/generate`, {
                method: "POST", headers: { "Content-Type": "application/json" },
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
    chatInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleChatSend(); });

    // ==========================================
    // FLASHCARD FEATURE
    // ==========================================
    (function () {
        // ── State
        let fcConfig = { count: 10, topic: '', difficulty: 'Intermediate', cardType: 'Mixed' };
        let fcCards = [], fcActiveCards = [], fcCardIdx = 0, fcRevealed = false, fcRatings = {};

        // ── Element shortcuts
        const el = id => document.getElementById(id);

        // ── Show/hide steps inside config modal
        function fcShowStep(step) {
            ['fcStepConfig', 'fcStepLoading', 'fcStepError'].forEach(s => el(s).classList.add('hidden'));
            el(step).classList.remove('hidden');
        }

        // ── Open config modal
        el('flashcardChip').addEventListener('click', () => {
            fcResetConfig();
            el('fcOverlay').classList.remove('hidden');
            fcShowStep('fcStepConfig');
        });

        function fcResetConfig() {
            fcConfig = { count: 10, topic: '', difficulty: 'Intermediate', cardType: 'Mixed' };
            el('fcTopic').value = '';
            el('fcTopicError').classList.add('hidden');
            el('fcTopic').classList.remove('fc-input-error');
            document.querySelectorAll('.fc-preset-btn').forEach(b => b.classList.toggle('fc-selected', b.dataset.val === '10'));
            document.querySelectorAll('#fcDiffRow .fc-pill-btn').forEach(b => b.classList.toggle('fc-pill-selected', b.dataset.val === 'Intermediate'));
            document.querySelectorAll('#fcTypeRow .fc-pill-btn').forEach(b => b.classList.toggle('fc-pill-selected', b.dataset.val === 'Mixed'));
        }

        // Preset count buttons
        document.querySelectorAll('.fc-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.fc-preset-btn').forEach(b => b.classList.remove('fc-selected'));
                btn.classList.add('fc-selected');
                fcConfig.count = parseInt(btn.dataset.val);
            });
        });

        // Difficulty pills
        document.querySelectorAll('#fcDiffRow .fc-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#fcDiffRow .fc-pill-btn').forEach(b => b.classList.remove('fc-pill-selected'));
                btn.classList.add('fc-pill-selected');
                fcConfig.difficulty = btn.dataset.val;
            });
        });

        // Card type pills
        document.querySelectorAll('#fcTypeRow .fc-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#fcTypeRow .fc-pill-btn').forEach(b => b.classList.remove('fc-pill-selected'));
                btn.classList.add('fc-pill-selected');
                fcConfig.cardType = btn.dataset.val;
            });
        });

        // Cancel modal
        el('fcCancelBtn').addEventListener('click', () => el('fcOverlay').classList.add('hidden'));

        // FIX 4 (preset bug): fcGenerate now reads count directly from the selected
        // preset button at call time, so 20 and 30 always work correctly.
        // fcRetryBtn now calls fcGenerate directly (no duplicate fcGenerateFromConfig needed).
        el('fcGenerateBtn').addEventListener('click', fcGenerate);
        el('fcTopic').addEventListener('keydown', e => { if (e.key === 'Enter') fcGenerate(); });
        el('fcRetryBtn').addEventListener('click', fcGenerate);
        el('fcBackBtn').addEventListener('click', () => fcShowStep('fcStepConfig'));

        async function fcGenerate() {
            // FIX 4: Read count from the visually selected button, not stale state
            const selectedPreset = document.querySelector('.fc-preset-btn.fc-selected');
            if (selectedPreset) fcConfig.count = parseInt(selectedPreset.dataset.val);

            fcConfig.topic = el('fcTopic').value.trim();
            if (!fcConfig.topic) {
                el('fcTopicError').classList.remove('hidden');
                el('fcTopic').classList.add('fc-input-error');
                return;
            }
            el('fcTopicError').classList.add('hidden');
            el('fcTopic').classList.remove('fc-input-error');

            el('fcLoadCount').textContent = fcConfig.count;
            el('fcLoadTopic').textContent = `"${fcConfig.topic}"`;
            fcShowStep('fcStepLoading');

            // FIX 4 (cont): Single prompt build — no duplication
            const prompt = `Generate exactly ${fcConfig.count} flashcards about "${fcConfig.topic}". Difficulty: ${fcConfig.difficulty}. Type: ${fcConfig.cardType}. Respond with ONLY a valid JSON array. Each item must have: "question", "answer", "explanation", "hint". Keep questions concise. Answers 1-3 sentences. No markdown, no extra text.`;

            try {
                const res = await apiFetch(`${API_BASE}/generate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt, max_tokens: fcConfig.count <= 10 ? 2000 : fcConfig.count <= 20 ? 4000 : 6000
                    })
                });
                if (!res.ok) throw new Error("Backend error");
                const data = await res.json();
                const raw = data.response.replace(/```json|```/g, '').trim();
                fcCards = JSON.parse(raw).map((c, i) => ({ ...c, id: i }));
                el('fcOverlay').classList.add('hidden');
                fcShowReview();
            } catch (e) {
                el('fcErrorMsg').textContent = "Generation failed. Please try again.";
                fcShowStep('fcStepError');
            }
        }

        // ── Review screen
        function fcShowReview() {
            el('fcReviewMeta').textContent = `${fcCards.length} cards · ${fcConfig.topic} · ${fcConfig.difficulty}`;
            fcRenderCardList();
            el('fcReviewScreen').classList.remove('hidden');
        }

        function fcRenderCardList() {
            const list = el('fcCardList');
            list.innerHTML = '';
            fcCards.forEach((card, idx) => {
                const row = document.createElement('div');
                row.className = 'fc-card-row';
                row.innerHTML = `
                <span class="fc-card-num">#${idx + 1}</span>
                <div class="fc-card-content">
                    <div class="fc-card-question">${card.question}</div>
                    <div class="fc-card-answer-preview">${card.answer}</div>
                </div>
                <button class="fc-edit-btn" data-idx="${idx}" title="Edit">✎</button>`;
                list.appendChild(row);
            });

            list.querySelectorAll('.fc-edit-btn').forEach(btn => {
                btn.addEventListener('click', () => fcOpenEdit(parseInt(btn.dataset.idx)));
            });
        }

        function fcOpenEdit(idx) {
            const list = el('fcCardList');
            const rows = list.querySelectorAll('.fc-card-row');
            const row = rows[idx];
            row.classList.add('fc-editing');
            row.innerHTML = `
            <span class="fc-card-num">#${idx + 1}</span>
            <div class="fc-card-content">
                <div class="fc-edit-form">
                    <textarea id="fcEditQ" rows="2">${fcCards[idx].question}</textarea>
                    <textarea id="fcEditA" rows="2">${fcCards[idx].answer}</textarea>
                    <div class="fc-edit-actions">
                        <button class="fc-btn fc-btn-primary fc-btn-sm" id="fcSaveEdit">Save</button>
                        <button class="fc-btn fc-btn-ghost fc-btn-sm" id="fcCancelEdit">Cancel</button>
                    </div>
                </div>
            </div>`;
            el('fcSaveEdit').addEventListener('click', () => {
                fcCards[idx].question = el('fcEditQ').value.trim();
                fcCards[idx].answer = el('fcEditA').value.trim();
                fcRenderCardList();
            });
            el('fcCancelEdit').addEventListener('click', () => fcRenderCardList());
        }

        el('fcRegenBtn').addEventListener('click', () => {
            el('fcReviewScreen').classList.add('hidden');
            el('fcOverlay').classList.remove('hidden');
            fcShowStep('fcStepLoading');
            fcGenerate();
        });

        el('fcStartBtn').addEventListener('click', () => fcStartMode(fcCards));

        // ── Flashcard mode
        function fcStartMode(deck) {
            fcActiveCards = deck;
            fcCardIdx = 0;
            fcRevealed = false;
            fcRatings = {};
            el('fcReviewScreen').classList.add('hidden');
            el('fcSummaryScreen').classList.add('hidden');
            el('fcModeScreen').classList.remove('hidden');
            fcRenderCard();
        }

        function fcRenderCard() {
            const card = fcActiveCards[fcCardIdx];
            const total = fcActiveCards.length;

            // topbar
            el('fcTopicLabel').textContent = fcConfig.topic;
            el('fcProgressText').textContent = `Card ${fcCardIdx + 1} of ${total}`;
            el('fcProgressFill').style.width = `${((fcCardIdx + 1) / total) * 100}%`;

            // desktop
            el('fcCardQ').textContent = card.question;
            el('fcPrevBtn').disabled = fcCardIdx === 0;
            el('fcNextBtn').textContent = fcCardIdx === total - 1 ? 'Finish' : 'Next →';
            el('fcShowBtn').classList.remove('hidden');
            el('fcAnswerBlock').classList.add('hidden');
            el('fcRightEmpty').classList.remove('hidden');

            // clear ratings
            document.querySelectorAll('#fcPanes .fc-rating-btn').forEach(b => b.classList.remove('fc-rated'));
            if (fcRatings[fcCardIdx]) {
                document.querySelectorAll('#fcPanes .fc-rating-btn').forEach(b => {
                    if (b.dataset.rating === fcRatings[fcCardIdx]) b.classList.add('fc-rated');
                });
            }

            // mobile
            el('fcMobileCard').textContent = card.question;
            el('fcMobileShowBtn').classList.remove('hidden');
            el('fcMobileAnswer').classList.add('hidden');
            el('fcMobileRating').style.display = 'none';
            el('fcMobilePrev').disabled = fcCardIdx === 0;
            el('fcMobileNext').textContent = fcCardIdx === total - 1 ? 'Finish' : 'Next →';
        }

        // Show answer (desktop)
        el('fcShowBtn').addEventListener('click', () => {
            fcRevealed = true;
            const card = fcActiveCards[fcCardIdx];
            el('fcShowBtn').classList.add('hidden');
            el('fcRightEmpty').classList.add('hidden');
            el('fcAnswerBlock').classList.remove('hidden');
            el('fcAnswerText').textContent = card.answer;
            el('fcExplText').textContent = card.explanation || '';
            el('fcExplSection').style.display = card.explanation ? 'block' : 'none';
            el('fcHintText').textContent = card.hint ? '💡 ' + card.hint : '';
            el('fcHintSection').style.display = card.hint ? 'block' : 'none';
        });

        // Show answer (mobile)
        el('fcMobileShowBtn').addEventListener('click', () => {
            const card = fcActiveCards[fcCardIdx];
            el('fcMobileShowBtn').classList.add('hidden');
            el('fcMobileAnswer').textContent = card.answer;
            el('fcMobileAnswer').classList.remove('hidden');
            el('fcMobileRating').style.display = 'flex';
        });

        // Rating (desktop)
        document.querySelectorAll('#fcPanes .fc-rating-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                fcRatings[fcCardIdx] = btn.dataset.rating;
                document.querySelectorAll('#fcPanes .fc-rating-btn').forEach(b => b.classList.remove('fc-rated'));
                btn.classList.add('fc-rated');
            });
        });

        // Rating (mobile)
        document.querySelectorAll('#fcMobileRating .fc-rating-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                fcRatings[fcCardIdx] = btn.dataset.rating;
                document.querySelectorAll('#fcMobileRating .fc-rating-btn').forEach(b => b.classList.remove('fc-rated'));
                btn.classList.add('fc-rated');
            });
        });

        // Nav (desktop)
        el('fcPrevBtn').addEventListener('click', () => { if (fcCardIdx > 0) { fcCardIdx--; fcRenderCard(); } });
        el('fcNextBtn').addEventListener('click', fcNext);

        // Nav (mobile)
        el('fcMobilePrev').addEventListener('click', () => { if (fcCardIdx > 0) { fcCardIdx--; fcRenderCard(); } });
        el('fcMobileNext').addEventListener('click', fcNext);

        function fcNext() {
            if (fcCardIdx < fcActiveCards.length - 1) {
                fcCardIdx++;
                fcRenderCard();
            } else {
                fcShowSummary();
            }
        }

        // ── Exit handling
        el('fcExitBtn').addEventListener('click', () => fcAskExit());

        function fcAskExit() {
            el('fcExitOverlay').classList.remove('hidden');
        }

        el('fcExitCancelBtn').addEventListener('click', () => el('fcExitOverlay').classList.add('hidden'));
        el('fcExitConfirmBtn').addEventListener('click', () => {
            el('fcExitOverlay').classList.add('hidden');
            el('fcModeScreen').classList.add('hidden');
            el('fcReviewScreen').classList.add('hidden');
        });

        // Intercept other chip buttons during flashcard mode
        document.querySelectorAll('.chip').forEach(chip => {
            if (chip.id === 'flashcardChip') return;
            chip.addEventListener('click', () => {
                if (!el('fcModeScreen').classList.contains('hidden') || !el('fcReviewScreen').classList.contains('hidden')) {
                    fcAskExit();
                }
            });
        });

        // FIX 6: Re-added fcGuardedIds intercept that was removed in the last version,
        // so header/sidebar buttons correctly trigger exit warning during a flashcard session
        const fcGuardedIds = [
            'newNoteBtn', 'historyToggle', 'savedToggle', 'clearHistoryBtn',
            'logoutBtn', 'settingsBtn', 'chatToggleBtn', 'focusBtn',
            'focusSoundBtn', 'pdfBtn', 'processBtn', 'userToggleBtn'
        ];
        fcGuardedIds.forEach(id => {
            const btn = el(id);
            if (!btn) return;
            btn.addEventListener('click', (e) => {
                const inSession = !el('fcModeScreen').classList.contains('hidden') ||
                    !el('fcReviewScreen').classList.contains('hidden');
                if (inSession) {
                    e.stopImmediatePropagation();
                    fcAskExit();
                }
            }, true);
        });

        // ── Summary
        function fcShowSummary() {
            el('fcModeScreen').classList.add('hidden');
            const got = Object.values(fcRatings).filter(r => r === 'got').length;
            const almost = Object.values(fcRatings).filter(r => r === 'almost').length;
            const missed = Object.values(fcRatings).filter(r => r === 'missed').length;
            el('fcGotNum').textContent = got;
            el('fcAlmostNum').textContent = almost;
            el('fcMissedNum').textContent = missed;
            el('fcSummarySub').textContent = `${fcConfig.topic} · ${fcActiveCards.length} cards reviewed`;
            const reviewMissedBtn = el('fcReviewMissedBtn');
            if (missed > 0) {
                reviewMissedBtn.classList.remove('hidden');
                reviewMissedBtn.textContent = `Review ${missed} Missed Card${missed !== 1 ? 's' : ''}`;
            } else {
                reviewMissedBtn.classList.add('hidden');
            }
            el('fcSummaryScreen').classList.remove('hidden');
        }

        el('fcReviewMissedBtn').addEventListener('click', () => {
            const missed = fcCards.filter((_, i) => fcRatings[i] === 'missed');
            el('fcSummaryScreen').classList.add('hidden');
            fcStartMode(missed);
        });

        el('fcRestartBtn').addEventListener('click', () => {
            el('fcSummaryScreen').classList.add('hidden');
            fcStartMode(fcCards);
        });

        el('fcSummaryExitBtn').addEventListener('click', () => {
            el('fcSummaryScreen').classList.add('hidden');
        });

    })();
});