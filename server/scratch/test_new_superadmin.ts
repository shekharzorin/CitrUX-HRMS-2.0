import axios from 'axios';

const testLogin = async () => {
    const email = 'shekharzorin@gmail.com';
    const password = 'Admin@123';
    const url = 'http://localhost:5000/api/auth/login';

    console.log(`Testing Login for NEW Super Admin: ${email}...`);

    try {
        const response = await axios.post(url, { email, password });
        console.log('✅ Login Successful!');
        console.log('Response Status:', response.status);
        console.log('User Role:', response.data.user.role);
        console.log('Company:', response.data.user.companyId || 'GLOBAL');
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
