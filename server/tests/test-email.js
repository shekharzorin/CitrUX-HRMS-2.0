// Native fetch in Node 18+

async function test() {
    try {
        const response = await fetch('http://localhost:5001/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'vadidek570@cimario.com' })
        });
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Body:', data);
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
