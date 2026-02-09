
async function main() {
    try {
        const baseUrl = 'http://localhost:5001/api';
        console.log('🔄 Attempting Login with Test@123...');

        const loginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'vadidek570@cimario.com', password: 'Test@123' })
        });

        if (loginRes.status !== 200) {
            console.log('❌ Login Failed. Status:', loginRes.status);
            console.log(await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('✅ Login Successful.');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 1. Check User History
        console.log('\n📅 Fetching Attendance History...');
        const historyRes = await fetch(`${baseUrl}/attendance/my-history`, { headers });
        if (historyRes.status === 200) {
            const history = await historyRes.json();
            console.log(`✅ History fetched. Records: ${history.length}`);
            if (history.length > 0) console.log('Latest:', history[0]);
        } else {
            console.log('❌ History Fetch Failed:', historyRes.status);
        }

        // 2. Punch In
        console.log('\n⏰ Attempting Punch In...');
        const punchInRes = await fetch(`${baseUrl}/attendance/punch-in`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ location: 'Test Script', workDate: new Date().toISOString().split('T')[0] })
        });

        if (punchInRes.status === 200) {
            console.log('✅ Punch In Successful:', await punchInRes.json());
        } else {
            console.log('⚠️ Punch In Failed (Might be already punched in):', punchInRes.status);
            console.log(await punchInRes.text());
        }

        // 3. Start Break
        console.log('\n☕ Attempting Start Break...');
        const breakStartRes = await fetch(`${baseUrl}/attendance/break/start`, {
            method: 'POST', headers, body: JSON.stringify({})
        });
        if (breakStartRes.status === 200) {
            console.log('✅ Break Started:', await breakStartRes.json());
        } else {
            console.log('⚠️ Break Start Failed:', breakStartRes.status);
        }

        // 4. End Break
        console.log('\n▶️ Attempting End Break...');
        const breakEndRes = await fetch(`${baseUrl}/attendance/break/end`, {
            method: 'POST', headers, body: JSON.stringify({})
        });
        if (breakEndRes.status === 200) {
            console.log('✅ Break Ended:', await breakEndRes.json());
        } else {
            console.log('⚠️ Break End Failed:', breakEndRes.status);
        }

        // 5. Punch Out
        console.log('\n🚪 Attempting Punch Out...');
        const punchOutRes = await fetch(`${baseUrl}/attendance/punch-out`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ location: 'Test Script' })
        });

        if (punchOutRes.status === 200) {
            console.log('✅ Punch Out Successful:', await punchOutRes.json());
        } else {
            console.log('⚠️ Punch Out Failed:', punchOutRes.status);
            console.log(await punchOutRes.text());
        }

    } catch (e) {
        console.error('Test Error:', e);
    }
}

main();
