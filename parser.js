/* ==========================================
   WhatsApp Chat Parser
   Parses WhatsApp exported .txt files into
   structured JSON messages.
   ========================================== */

const WhatsAppParser = (() => {
    // Regex patterns for WhatsApp message formats
    // Supports: DD/MM/YYYY, MM/DD/YYYY, and various separators
    const MESSAGE_PATTERNS = [
        // Format: DD/MM/YYYY, HH:MM - Sender: Message
        /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s*[-–]\s*(.+?):\s(.+)$/,
        // Format: [DD/MM/YYYY, HH:MM:SS] Sender: Message (bracket style)
        /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s*(.+?):\s(.+)$/,
        // Format: YYYY-MM-DD HH:MM - Sender: Message
        /^(\d{4}-\d{1,2}-\d{1,2}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–]\s*(.+?):\s(.+)$/,
    ];

    // System message patterns (not from users)
    const SYSTEM_PATTERNS = [
        /messages and calls are end-to-end encrypted/i,
        /created group/i,
        /added you/i,
        /left$/i,
        /removed$/i,
        /changed the subject/i,
        /changed this group/i,
        /changed the group/i,
        /joined using this group/i,
    ];

    /**
     * Parse raw WhatsApp export text into structured messages
     * @param {string} rawText - Raw text from WhatsApp export
     * @returns {{ messages: Array, stats: Object }}
     */
    function parse(rawText) {
        if (!rawText || typeof rawText !== 'string') {
            return { messages: [], stats: { total: 0, senders: {} } };
        }

        const lines = rawText.split('\n');
        const messages = [];
        let currentMessage = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const parsed = parseLine(trimmed);

            if (parsed) {
                // Save previous multi-line message
                if (currentMessage) {
                    messages.push(currentMessage);
                }
                currentMessage = parsed;
            } else if (currentMessage) {
                // Multi-line message continuation
                currentMessage.message += '\n' + trimmed;
            }
        }

        // Don't forget the last message
        if (currentMessage) {
            messages.push(currentMessage);
        }

        // Filter out system messages
        const userMessages = messages.filter(m => !isSystemMessage(m));

        return {
            messages: userMessages,
            stats: generateStats(userMessages),
        };
    }

    /**
     * Try to parse a single line against all patterns
     */
    function parseLine(line) {
        for (const pattern of MESSAGE_PATTERNS) {
            const match = line.match(pattern);
            if (match) {
                return {
                    date: match[1].trim(),
                    time: match[2].trim(),
                    sender: match[3].trim(),
                    message: match[4].trim(),
                };
            }
        }
        return null;
    }

    /**
     * Check if a message is a system notification
     */
    function isSystemMessage(msg) {
        return SYSTEM_PATTERNS.some(p => p.test(msg.message));
    }

    /**
     * Generate stats from parsed messages
     */
    function generateStats(messages) {
        const senders = {};
        for (const msg of messages) {
            senders[msg.sender] = (senders[msg.sender] || 0) + 1;
        }

        return {
            total: messages.length,
            senders,
            dateRange: messages.length > 0
                ? { from: messages[0].date, to: messages[messages.length - 1].date }
                : null,
        };
    }

    // Public API
    return { parse };
})();
