/* ==========================================
   Storage Module
   Handles Firebase, Supabase, and Google
   Sheets integrations.
   ========================================== */

const Storage = (() => {
    const CONFIG_KEY = 'whatsapp_summarizer_config';

    /**
     * Get saved configuration from localStorage
     */
    function getConfig() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {};
        } catch {
            return {};
        }
    }

    /**
     * Save configuration to localStorage
     */
    function saveConfig(updates) {
        const config = { ...getConfig(), ...updates };
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        return config;
    }

    /**
     * Get current storage provider
     */
    function getProvider() {
        return getConfig().provider || 'firebase';
    }

    /**
     * Set storage provider
     */
    function setProvider(provider) {
        saveConfig({ provider });
    }

    // ============================
    // Gemini API
    // ============================
    async function summarizeWithGemini(messages) {
        const config = getConfig();
        const apiKey = config.geminiKey;

        if (!apiKey) {
            throw new Error('Gemini API key not configured. Go to Settings.');
        }

        const chatText = messages
            .map(m => `[${m.date} ${m.time}] ${m.sender}: ${m.message}`)
            .join('\n');

        const prompt = `You are a helpful assistant. Summarize the following WhatsApp conversation. 
Provide:
1. A brief overview (2-3 sentences)
2. Key topics discussed
3. Action items or decisions made (if any)
4. Notable mentions or important details

Format your response with clear headings using ### for sections.

Chat:
${chatText}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 2048,
                    },
                }),
            }
        );

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Gemini API error');
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary generated.';
    }

    // ============================
    // Google Sheets API
    // ============================
    async function saveToSheets(messages) {
        const config = getConfig();
        const { sheetId, sheetsApiKey } = config;

        if (!sheetId || !sheetsApiKey) {
            throw new Error('Google Sheets not configured. Go to Settings.');
        }

        const values = messages.map(m => [m.date, m.time, m.sender, m.message]);

        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED&key=${sheetsApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ values }),
            }
        );

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Google Sheets API error');
        }

        return await response.json();
    }

    // ============================
    // Firebase (Firestore REST API)
    // ============================
    async function saveToFirebase(messages) {
        const config = getConfig();
        const { fbProjectId, fbApiKey } = config;

        if (!fbProjectId || !fbApiKey) {
            throw new Error('Firebase not configured. Go to Settings.');
        }

        const baseUrl = `https://firestore.googleapis.com/v1/projects/${fbProjectId}/databases/(default)/documents/whatsapp_messages?key=${fbApiKey}`;

        const batch = messages.map(m => ({
            fields: {
                date: { stringValue: m.date },
                time: { stringValue: m.time },
                sender: { stringValue: m.sender },
                message: { stringValue: m.message },
                createdAt: { timestampValue: new Date().toISOString() },
            },
        }));

        // Send in batches of 20
        const batchSize = 20;
        let saved = 0;

        for (let i = 0; i < batch.length; i += batchSize) {
            const chunk = batch.slice(i, i + batchSize);
            const promises = chunk.map(doc =>
                fetch(baseUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(doc),
                })
            );
            await Promise.all(promises);
            saved += chunk.length;
        }

        return { saved };
    }

    // ============================
    // Supabase (REST API)
    // ============================
    async function saveToSupabase(messages) {
        const config = getConfig();
        const { sbUrl, sbAnonKey } = config;

        if (!sbUrl || !sbAnonKey) {
            throw new Error('Supabase not configured. Go to Settings.');
        }

        const rows = messages.map(m => ({
            date: m.date,
            time: m.time,
            sender: m.sender,
            message: m.message,
        }));

        const response = await fetch(`${sbUrl}/rest/v1/whatsapp_messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': sbAnonKey,
                'Authorization': `Bearer ${sbAnonKey}`,
                'Prefer': 'return=minimal',
            },
            body: JSON.stringify(rows),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || 'Supabase API error');
        }

        return { saved: rows.length };
    }

    /**
     * Save messages to the currently selected provider
     */
    async function saveToDb(messages) {
        const provider = getProvider();
        if (provider === 'supabase') {
            return saveToSupabase(messages);
        }
        return saveToFirebase(messages);
    }

    // Public API
    return {
        getConfig,
        saveConfig,
        getProvider,
        setProvider,
        summarizeWithGemini,
        saveToSheets,
        saveToDb,
    };
})();
