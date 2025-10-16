const axios = require('axios');
const BASE_URL = 'http://localhost:3000/api';

// Test users to create
const testUsers = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    email: 'admin@example.com',
    name: 'Admin User'
  },
  {
    username: 'customer',
    password: 'customer123',
    role: 'customer',
    email: 'customer@example.com',
    name: 'Test Customer'
  },
  {
    username: 'printuser',
    password: 'print123',
    role: 'customer',
    email: 'printuser@example.com',
    name: 'Print User'
  },
  {
    username: 'reviewer1',
    password: 'review123',
    role: 'customer',
    email: 'reviewer1@example.com',
    name: 'Reviewer One'
  },
  {
    username: 'reviewer2',
    password: 'review123',
    role: 'customer',
    email: 'reviewer2@example.com',
    name: 'Reviewer Two'
  }
];

async function createUser(user) {
  try {
    console.log(`Creating user: ${user.username}`);
    const response = await axios.post(`${BASE_URL}/auth/signup`, user);
    console.log(`✅ Created user: ${user.username} (${response.data.user._id})`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`ℹ️ User ${user.username} already exists`);
      // Try to log in to get token
      try {
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
          username: user.username,
          password: user.password
        });
        console.log(`✅ Logged in as ${user.username}`);
        return loginRes.data;
      } catch (loginError) {
        console.error(`❌ Failed to log in as ${user.username}:`, loginError.response?.data?.message || loginError.message);
        return null;
      }
    } else {
      console.error(`❌ Error creating user ${user.username}:`, error.response?.data?.message || error.message);
      return null;
    }
  }
}

async function setupTestUsers() {
  console.log('🚀 Setting up test users...');
  
  for (const user of testUsers) {
    await createUser(user);
  }
  
  console.log('\n🎉 Test user setup completed!');
  console.log('You can now run the tests using:');
  console.log('cd /Users/lochgraphy/Desktop/NethwinLK/backend/test');
  console.log('node run-tests.js');
}

// Run the setup
setupTestUsers().catch(console.error);
