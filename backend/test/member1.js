const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testUser = {
  name: 'Test User 1',
  email: `test${Date.now()}@example.com`,
  password: 'test123',
  role: 'customer'
};

let authToken = '';

// Helper function to make authenticated requests
const authRequest = async (method, url, data = null) => {
  const config = {
    method,
    url: `${BASE_URL}${url}`,
    headers: {}
  };

  if (authToken) {
    config.headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

// Test cases for Member 1's features
async function runTests() {
  console.log('🚀 Starting tests for Member 1 - User Management Module');
  
  // 1. Test user registration
  console.log('\n1. Testing user registration...');
  const registerRes = await authRequest('POST', '/auth/signup', testUser);
  if (registerRes.success) {
    console.log('✅ User registration successful');
    console.log('   User ID:', registerRes.data.user._id);
  } else {
    console.error('❌ User registration failed:', registerRes.error);
    return;
  }

  // 2. Test user login
  console.log('\n2. Testing user login...');
  const loginRes = await authRequest('POST', '/auth/login', {
    email: testUser.email,
    password: testUser.password
  });

  if (loginRes.success) {
    authToken = loginRes.data.token;
    console.log('✅ User login successful');
    console.log('   Token received');
  } else {
    console.error('❌ User login failed:', loginRes.error);
    return;
  }

  // 3. Test getting current user profile
  console.log('\n3. Testing get current user profile...');
  const profileRes = await authRequest('GET', '/me');
  if (profileRes.success) {
    console.log('✅ Profile retrieved successfully');
    console.log('   User email:', profileRes.data.email);
  } else {
    console.error('❌ Failed to get profile:', profileRes.error);
  }

  // 4. Test updating user profile
  console.log('\n4. Testing profile update...');
  const updateRes = await authRequest('PUT', '/me', {
    name: 'Updated Test User',
    phone: '1234567890'
  });
  
  if (updateRes.success) {
    console.log('✅ Profile updated successfully');
    console.log('   New name:', updateRes.data.name);
  } else {
    console.error('❌ Profile update failed:', updateRes.error);
  }

  console.log('\n🎉 All tests for Member 1 completed!');
}

// Run the tests
runTests().catch(console.error);
