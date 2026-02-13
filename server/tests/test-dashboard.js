
async function main() {
    try {
        const baseUrl = 'http://localhost:5001/api';
        console.log('🔄 Attempting Login with Test@123...');

        const loginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'vadidek570@cimario.com', password: 'Test@123' })
        });

        if (loginRes.status === 401) {
            console.log('⚠️ Login failed (Password changed?).');
            console.log('❌ Login Failed. Status:', loginRes.status);
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('✅ Login Successful. Token obtained.');

        // STATS
        console.log('\n📊 Fetching Stats...');
        const statsRes = await fetch(`${baseUrl}/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Stats Status:', statsRes.status);
        if (statsRes.status === 200) {
            const stats = await statsRes.json();
            console.log('✅ Stats Data received:', Object.keys(stats));
        } else {
            console.log('❌ Stats Fetch Failed:', statsRes.status);
            console.log(await statsRes.text());
        }

        // NOTIFICATIONS
        console.log('\n🔔 Fetching Notifications...');
        const notifRes = await fetch(`${baseUrl}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Notifications Status:', notifRes.status);
        if (notifRes.status === 200) {
            const notifs = await notifRes.json();
            console.log('✅ Notifications Data received:', Array.isArray(notifs) ? notifs.length : 'Not Array');
        } else {
            console.log('❌ Notifications Fetch Failed from ' + notifRes.url);
            console.log(await notifRes.text());
        }

    } catch (e) {
        console.error('Test Error:', e);
    }
}

main();
