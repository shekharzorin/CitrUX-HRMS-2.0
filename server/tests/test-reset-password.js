const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const email = 'superadmin@citrux.com'; // Existing user
        const newPassword = 'NewPassword@123';
        const baseUrl = 'http://localhost:5000/api';

        console.log(`🔍 Checking if user ${email} exists...`);
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.log(`❌ User ${email} not found. Please create a test user first.`);
            return;
        }
        console.log('✅ User found.');

        // 1. Request Forgot Password
        console.log('\n📧 Requesting Password Reset (Testing endpoint health)...');
        const forgotRes = await fetch(`${baseUrl}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (forgotRes.status !== 200 && forgotRes.status !== 429) { // 429 possible if rate limited
            console.log('❌ Forgot Password Request Failed:', forgotRes.status);
            console.log(await forgotRes.text());
            return;
        }
        console.log('✅ Forgot Password Request Handled successfully.');

        // 2. Programmatically generate token (bypassing email for test)
        console.log('\n🕵️ Generating Test Reset Token via DB...');
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(rawToken, 10);
        
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: tokenHash,
                resetTokenExpiry: new Date(Date.now() + 3600000)
            }
        });
        console.log('✅ Test token injected into DB.');

        // 3. Reset Password
        console.log('\n🔐 Resetting Password via API...');
        const resetRes = await fetch(`${baseUrl}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: rawToken, uid: user.id, newPassword }) 
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
            console.log('🎉 Login Successful! End-to-End Flow Verified.');
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
