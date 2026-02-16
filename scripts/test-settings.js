const axios = require('axios');

async function testBackend() {
    const API_URL = 'http://localhost:5000/api';

    try {
        console.log('1. Attempting Login...');
        // Try to login (assuming test user exists, if not request will fail but we'll see why)
        // Creating a dynamic user to ensure it exists or use a known one?
        // Let's try to register first to be safe.
        const validUser = {
            name: "Test Debugger",
            username: `debug_${Date.now()}`,
            email: `debug_${Date.now()}@test.com`,
            password: "password123"
        };

        let token;

        try {
            console.log('   Registering new user:', validUser.username);
            const regRes = await axios.post(`${API_URL}/auth/register`, validUser);
            // Login immediately
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                email: validUser.email,
                password: validUser.password
            });
            token = loginRes.data.token;
            console.log('   Login Successful. Token obtained.');
        } catch (e) {
            console.log('   Registration/Login failed (maybe user exists, trying login only)');
            // Fallback login
            try {
                const loginRes = await axios.post(`${API_URL}/auth/login`, {
                    email: "test@test.com",
                    password: "password123"
                });
                token = loginRes.data.token;
                console.log('   Login Successful (fallback). Token obtained.');
            } catch (loginErr) {
                console.error('   ALL LOGIN ATTEMPTS FAILED', loginErr.response?.data || loginErr.message);
                return;
            }
        }

        console.log('2. Testing GET /settings/me ...');
        try {
            const settingsRes = await axios.get(`${API_URL}/settings/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('   SUCCESS! Settings Data:', settingsRes.data);
        } catch (err) {
            console.error('   FAILED /settings/me');
            console.error('   Status:', err.response?.status);
            console.error('   Data:', err.response?.data);
        }

    } catch (error) {
        console.error('Unexpected script error:', error.message);
    }
}

testBackend();
