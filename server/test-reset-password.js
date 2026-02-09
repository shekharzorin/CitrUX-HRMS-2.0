
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const email = 'shekharzorin@gmail.com';
        const newPassword = 'NewPassword@123';
        const baseUrl = 'http://localhost:5001/api';
        const logPath = path.join(__dirname, 'auth_debug.log');

        // Clear log file first to avoid reading old tokens
        if (fs.existsSync(logPath)) {
            fs.writeFileSync(logPath, '');
        }

        console.log(`🔍 Checking if user ${email} exists...`);
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.log(`❌ User ${email} not found.`);
            return;
        }
        console.log('✅ User found.');

        // 1. Request Forgot Password
        console.log('\n📧 Requesting Password Reset...');
        const forgotRes = await fetch(`${baseUrl}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (forgotRes.status !== 200) {
            console.log('❌ Forgot Password Request Failed:', forgotRes.status);
            console.log(await forgotRes.text());
            return;
        }
        console.log('✅ Forgot Password Request Sent.');

        // 2. Read Token from Log (Simulating Email Receipt)
        console.log('\n🕵️ Fetching Reset Token from Auth Log...');

        // Wait for log to be written
        await new Promise(r => setTimeout(r, 1000));

        if (!fs.existsSync(logPath)) {
            console.log('❌ Log file not found.');
            return;
        }

        const logContent = fs.readFileSync(logPath, 'utf8');
        const tokenMatch = logContent.match(/DEBUG_TOKEN: ([^\s]+)/);

        if (!tokenMatch) {
            console.log('❌ No token found in log.');
            return;
        }

        const resetToken = tokenMatch[1];
        console.log('✅ Token retrieved from log.');

        // 3. Reset Password
        console.log('\n🔐 Resetting Password...');
        const resetRes = await fetch(`${baseUrl}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: resetToken, newPassword: newPassword }) // Note: controller expects 'newPassword'
        });

        if (resetRes.status === 200) {
            console.log('✅ Password Reset Successful.');
        } else {
            console.log('❌ Password Reset Failed:', resetRes.status);
            console.log(await resetRes.text());
            return;
        }

        // 4. Verify Login with New Password
        console.log('\n✅ Verifying Login with New Password...');
        const loginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: newPassword })
        });

        if (loginRes.status === 200) {
            console.log('🎉 Login Successful! Flow Verified.');
        } else {
            console.log('❌ Login Failed with new password:', loginRes.status);
            console.log(await loginRes.text());
        }

    } catch (e) {
        console.error('Test Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
