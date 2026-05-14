import axios from 'axios';

const testLogin = async () => {
    const email = 'superadmin@citrux.com';
    const password = 'SuperAdmin@123';
    const url = 'http://localhost:5000/api/auth/login';

    console.log(`Testing Login for ${email}...`);

    try {
        const response = await axios.post(url, { email, password });
        console.log('✅ Login Successful!');
        console.log('Response Status:', response.status);
        console.log('User Role:', response.data.user.role);
        console.log('Company:', response.data.user.companyId || 'GLOBAL');
        // console.log('Token:', response.data.token);
    } catch (error: any) {
        console.error('❌ Login Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Message:', error.response.data.message);
        } else {
            console.error('Error:', error.message);
        }
    }
};

testLogin();
