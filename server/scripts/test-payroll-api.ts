
import axios from 'axios';

const API_URL = 'http://localhost:5001/api';
const ADMIN_EMAIL = 'admin@citrux.com';
const ADMIN_PASSWORD = 'admin123';

async function testPayroll() {
    try {
        console.log('--- 1. Authenticating as Admin ---');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        const token = loginRes.data.token;
        console.log('✅ Login Successful. Token received.');

        const headers = { Authorization: `Bearer ${token}` };

        console.log('\n--- 2. Fetching Users ---');
        const usersRes = await axios.get(`${API_URL}/users`, { headers });
        const users = usersRes.data;
        console.log(`✅ Fetched ${users.length} users.`);
        const employeeIds = users.filter((u: any) => u.role === 'EMPLOYEE').map((u: any) => u.id);
        console.log(`ℹ️ Found ${employeeIds.length} employees for payroll.`);

        const today = new Date();
        const month = today.getMonth() + 1; // Current Month
        const year = today.getFullYear();

        console.log(`\n--- 3. Checking Payroll Stats for ${month}/${year} ---`);
        const statsRes = await axios.get(`${API_URL}/payroll/stats`, {
            headers,
            params: { month, year }
        });
        console.log('📊 Current Stats:', statsRes.data);

        console.log(`\n--- 4. Checking Payslips List for ${month}/${year} ---`);
        const listRes = await axios.get(`${API_URL}/payroll/list`, {
            headers,
            params: { month, year }
        });
        console.log(`📄 Found ${listRes.data.length} generated payslips.`);

        if (listRes.data.length === 0 && employeeIds.length > 0) {
            console.log('\n--- 5. Generating Payroll for first 2 employees ---');
            const targetIds = employeeIds.slice(0, 2);
            if (targetIds.length > 0) {
                const genRes = await axios.post(`${API_URL}/payroll/generate`, {
                    userIds: targetIds,
                    month,
                    year
                }, { headers });
                console.log('✅ Generation Result:', genRes.data);

                console.log('\n--- 6. Re-checking Stats after generation ---');
                const newStatsRes = await axios.get(`${API_URL}/payroll/stats`, {
                    headers,
                    params: { month, year }
                });
                console.log('📊 New Stats:', newStatsRes.data);
            } else {
                console.log('⚠️ No employees found to generate payroll for.');
            }
        } else {
            console.log('ℹ️ Payslips already exist or no employees to process. Skipping generation.');
        }

    } catch (error: any) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
    }
}

testPayroll();
