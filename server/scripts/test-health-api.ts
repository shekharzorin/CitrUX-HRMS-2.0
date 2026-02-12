
import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

async function testHealthApi() {
    try {
        console.log('🧪 Testing System Health API...');

        // 1. Login as Admin
        console.log('🔑 Authenticating as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@citrux.com',
            password: 'admin'
        });
        const token = loginRes.data.token;
        console.log('✅ Authenticated');

        // 2. Check System Status
        console.log('📊 Checking /health/status...');
        const statusRes = await axios.get(`${API_URL}/health/status`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (statusRes.status === 200 && statusRes.data.status) {
            console.log(`✅ System Status: ${statusRes.data.status}`);
            console.log('   Modules:', statusRes.data.modules.map((m: any) => `${m.name}: ${m.status}`).join(', '));
        } else {
            console.error('❌ Failed to fetch system status');
            process.exit(1);
        }

        // 3. Check System Errors
        console.log('🐛 Checking /health/errors...');
        const errorsRes = await axios.get(`${API_URL}/health/errors`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (errorsRes.status === 200 && Array.isArray(errorsRes.data.errors)) {
            console.log(`✅ Fetched ${errorsRes.data.errors.length} errors`);
        } else {
            console.error('❌ Failed to fetch system errors check');
        }

        console.log('🎉 Health API Verification Passed!');

    } catch (error: any) {
        console.error('❌ Test Failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

testHealthApi();
