/* ==========================================
   App Controller
   Wires up the UI, handles user interactions,
   and orchestrates parse/summarize/save flows.
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ============================
    // DOM References
    // ============================
    const $ = id => document.getElementById(id);

    const dropZone = $('dropZone');
    const fileInput = $('fileInput');
    const browseBtn = $('browseBtn');
    const fileInfo = $('fileInfo');
    const fileName = $('fileName');
    const fileRemove = $('fileRemove');
    const pasteArea = $('pasteArea');
    const parseBtn = $('parseBtn');
    const parsedSection = $('parsedSection');
    const messagesList = $('messagesList');
    const messageCount = $('messageCount');
    const summarizeBtn = $('summarizeBtn');
    const sheetsBtn = $('sheetsBtn');
    const saveDbBtn = $('saveDbBtn');
    const dbLabel = $('dbLabel');
    const summaryCard = $('summaryCard');
    const summaryBody = $('summaryBody');
    const summaryTime = $('summaryTime');
    const emptyState = $('emptyState');
    const loadingOverlay = $('loadingOverlay');
    const loaderText = $('loaderText');
    const toastContainer = $('toastContainer');
    const hamburger = $('hamburger');
    const navLinks = $('navLinks');

    // Settings inputs
    const geminiKeyInput = $('geminiKey');
    const sheetIdInput = $('sheetId');
    const sheetsApiKeyInput = $('sheetsApiKey');
    const fbApiKeyInput = $('fbApiKey');
    const fbProjectIdInput = $('fbProjectId');
    const fbAuthDomainInput = $('fbAuthDomain');
    const sbUrlInput = $('sbUrl');
    const sbAnonKeyInput = $('sbAnonKey');
    const toggleFirebase = $('toggleFirebase');
    const toggleSupabase = $('toggleSupabase');
    const firebaseConfig = $('firebaseConfig');
    const supabaseConfig = $('supabaseConfig');

    let parsedMessages = [];
    let uploadedText = '';

    // ============================
    // Initialize
    // ============================
    loadSettings();
    updateProviderUI();

    // ============================
    // Navigation
    // ============================
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // ============================
    // File Upload (Drag & Drop)
    // ============================
    browseBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    fileRemove.addEventListener('click', () => {
        uploadedText = '';
        fileInput.value = '';
        fileInfo.hidden = true;
        updateParseBtn();
    });

    function handleFile(file) {
        if (!file.name.endsWith('.txt')) {
            toast('Please upload a .txt file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedText = e.target.result;
            fileName.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            fileInfo.hidden = false;
            updateParseBtn();
            toast('File loaded successfully', 'success');
        };
        reader.readAsText(file);
    }

    // ============================
    // Paste Area
    // ============================
    pasteArea.addEventListener('input', () => {
        updateParseBtn();
    });

    function updateParseBtn() {
        const hasContent = uploadedText.length > 0 || pasteArea.value.trim().length > 0;
        parseBtn.disabled = !hasContent;
    }

    // ============================
    // Parse Messages
    // ============================
    parseBtn.addEventListener('click', () => {
        const text = uploadedText || pasteArea.value;
        if (!text.trim()) return;

        const result = WhatsAppParser.parse(text);
        parsedMessages = result.messages;

        if (parsedMessages.length === 0) {
            toast('No messages found. Check the format.', 'error');
            return;
        }

        messageCount.textContent = `${result.stats.total} messages`;
        renderMessages(parsedMessages);
        parsedSection.hidden = false;
        parsedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast(`Parsed ${result.stats.total} messages from ${Object.keys(result.stats.senders).length} senders`, 'success');
    });

    function renderMessages(messages) {
        const limit = Math.min(messages.length, 200);
        let html = '';
        for (let i = 0; i < limit; i++) {
            const m = messages[i];
            html += `
                <div class="message-row">
                    <span class="message-time">${escapeHtml(m.date)} ${escapeHtml(m.time)}</span>
                    <span class="message-sender">${escapeHtml(m.sender)}</span>
                    <span class="message-text">${escapeHtml(m.message)}</span>
                </div>`;
        }
        if (messages.length > limit) {
            html += `<div class="message-row" style="justify-content:center; color: var(--text-muted);">
                ... and ${messages.length - limit} more messages
            </div>`;
        }
        messagesList.innerHTML = html;
    }

    // ============================
    // Summarize with Gemini
    // ============================
    summarizeBtn.addEventListener('click', async () => {
        if (!parsedMessages.length) return;

        showLoading('Summarizing with Gemini AI...');
        try {
            const summary = await Storage.summarizeWithGemini(parsedMessages);
            summaryBody.innerHTML = markdownToHtml(summary);
            summaryTime.textContent = new Date().toLocaleString();
            summaryCard.hidden = false;
            emptyState.hidden = true;
            hideLoading();
            toast('Summary generated!', 'success');

            // Scroll to summary
            document.getElementById('summary').scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            hideLoading();
            toast(err.message, 'error');
        }
    });

    // ============================
    // Save to Google Sheets
    // ============================
    sheetsBtn.addEventListener('click', async () => {
        if (!parsedMessages.length) return;

        showLoading('Saving to Google Sheets...');
        try {
            await Storage.saveToSheets(parsedMessages);
            hideLoading();
            toast(`${parsedMessages.length} messages saved to Google Sheets`, 'success');
        } catch (err) {
            hideLoading();
            toast(err.message, 'error');
        }
    });

    // ============================
    // Save to Database
    // ============================
    saveDbBtn.addEventListener('click', async () => {
        if (!parsedMessages.length) return;

        const provider = Storage.getProvider();
        showLoading(`Saving to ${provider === 'supabase' ? 'Supabase' : 'Firebase'}...`);
        try {
            const result = await Storage.saveToDb(parsedMessages);
            hideLoading();
            toast(`${result.saved} messages saved to ${provider}`, 'success');
        } catch (err) {
            hideLoading();
            toast(err.message, 'error');
        }
    });

    // ============================
    // Pro Max: Border Glow Effect
    // ============================
    document.querySelectorAll('.upload-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', `${x}%`);
            card.style.setProperty('--mouse-y', `${y}%`);
        });
    });

    // ============================
    // Settings: Provider Toggle
    // ============================
    toggleFirebase.addEventListener('click', () => switchProvider('firebase'));
    toggleSupabase.addEventListener('click', () => switchProvider('supabase'));

    function switchProvider(provider) {
        Storage.setProvider(provider);
        updateProviderUI();
    }

    function updateProviderUI() {
        const provider = Storage.getProvider();
        const isFirebase = provider === 'firebase';

        toggleFirebase.classList.toggle('active', isFirebase);
        toggleSupabase.classList.toggle('active', !isFirebase);
        firebaseConfig.hidden = !isFirebase;
        supabaseConfig.hidden = isFirebase;
        dbLabel.textContent = isFirebase ? 'Firebase' : 'Supabase';
    }

    // ============================
    // Settings: Save Buttons
    // ============================
    $('saveGeminiKey').addEventListener('click', () => {
        Storage.saveConfig({ geminiKey: geminiKeyInput.value.trim() });
        toast('Gemini API key saved', 'success');
    });

    $('saveSheetsConfig').addEventListener('click', () => {
        Storage.saveConfig({
            sheetId: sheetIdInput.value.trim(),
            sheetsApiKey: sheetsApiKeyInput.value.trim(),
        });
        toast('Google Sheets config saved', 'success');
    });

    $('saveFirebaseConfig').addEventListener('click', () => {
        Storage.saveConfig({
            fbApiKey: fbApiKeyInput.value.trim(),
            fbProjectId: fbProjectIdInput.value.trim(),
            fbAuthDomain: fbAuthDomainInput.value.trim(),
        });
        toast('Firebase config saved', 'success');
    });

    $('saveSupabaseConfig').addEventListener('click', () => {
        Storage.saveConfig({
            sbUrl: sbUrlInput.value.trim(),
            sbAnonKey: sbAnonKeyInput.value.trim(),
        });
        toast('Supabase config saved', 'success');
    });

    // ============================
    // Load Settings from localStorage
    // ============================
    function loadSettings() {
        const config = Storage.getConfig();
        if (config.geminiKey) geminiKeyInput.value = config.geminiKey;
        if (config.sheetId) sheetIdInput.value = config.sheetId;
        if (config.sheetsApiKey) sheetsApiKeyInput.value = config.sheetsApiKey;
        if (config.fbApiKey) fbApiKeyInput.value = config.fbApiKey;
        if (config.fbProjectId) fbProjectIdInput.value = config.fbProjectId;
        if (config.fbAuthDomain) fbAuthDomainInput.value = config.fbAuthDomain;
        if (config.sbUrl) sbUrlInput.value = config.sbUrl;
        if (config.sbAnonKey) sbAnonKeyInput.value = config.sbAnonKey;
    }

    // ============================
    // Utilities
    // ============================
    function showLoading(text) {
        loaderText.textContent = text || 'Processing...';
        loadingOverlay.hidden = false;
    }

    function hideLoading() {
        loadingOverlay.hidden = true;
    }

    function toast(message, type = 'info') {
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = message;
        toastContainer.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(40px)';
            el.style.transition = '0.3s ease';
            setTimeout(() => el.remove(), 300);
        }, 3000);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function markdownToHtml(md) {
        return md
            .replace(/### (.+)/g, '<h3>$1</h3>')
            .replace(/## (.+)/g, '<h3>$1</h3>')
            .replace(/# (.+)/g, '<h3>$1</h3>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^- (.+)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>');
    }
});
