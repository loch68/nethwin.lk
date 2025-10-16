const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testUser1 = {
  username: 'reviewer1',  // First test user username
  password: 'review123'   // First test user password
};

const testUser2 = {
  username: 'reviewer2',  // Second test user username
  password: 'review123'   // Second test user password
};

const testAdmin = {
  username: 'admin',     // Admin username
  password: 'admin123'   // Admin password
};

let user1Token = '';
let user2Token = '';
let adminToken = '';
let testProductId = '';      // Will be set after creating a test product
let testReviewId = '';       // Will be set after creating a test review
let testMessageThreadId = ''; // Will be set after sending a test message

// Helper function to make authenticated requests
const authRequest = async (token, method, url, data = null) => {
  const config = {
    method,
    url: `${BASE_URL}${url}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
};

// Create a test product (admin only)
async function createTestProduct() {
  console.log('Creating test product...');
  const productData = {
    name: `Test Review Product ${Date.now()}`,
    description: 'Test product for review testing',
    price: 19.99,
    stock: 50,
    category: 'test',
    author: 'Test Author',
    isbn: `REVIEW-${Date.now()}`
  };

  const res = await authRequest(adminToken, 'POST', '/products', productData);
  if (res.success) {
    console.log('✅ Test product created');
    return res.data._id;
  } else {
    throw new Error(`Failed to create test product: ${res.error}`);
  }
}

// Test cases for Member 5's features (Reviews & Messaging)
async function runTests() {
  console.log('🚀 Starting tests for Member 5 - Reviews & Messaging Module');
  
  // 1. Login as admin (to create test product)
  console.log('\n1. Logging in as admin to create test product...');
  const adminLoginRes = await authRequest('', 'POST', '/auth/login', {
    email: testAdmin.email,
    password: testAdmin.password
  });

  if (adminLoginRes.success) {
    adminToken = adminLoginRes.data.token;
    console.log('✅ Admin login successful');
  } else {
    console.error('❌ Admin login failed:', adminLoginRes.error);
    return;
  }

  // 2. Create a test product
  try {
    testProductId = await createTestProduct();
  } catch (error) {
    console.error('❌ Failed to create test product:', error.message);
    return;
  }

  // 3. Login as user 1
  console.log('\n2. Logging in as user 1...');
  const user1LoginRes = await authRequest('', 'POST', '/auth/login', {
    email: testUser1.email,
    password: testUser1.password
  });

  if (user1LoginRes.success) {
    user1Token = user1LoginRes.data.token;
    console.log('✅ User 1 login successful');
  } else {
    console.error('❌ User 1 login failed:', user1LoginRes.error);
    return;
  }

  // 4. Test creating a review
  console.log('\n3. Testing review creation...');
  const reviewData = {
    productId: testProductId,
    rating: 5,
    comment: 'This is an excellent product!',
    userId: user1LoginRes.data.user._id,
    userName: 'Test Reviewer'
  };

  const createReviewRes = await authRequest(user1Token, 'POST', '/reviews', reviewData);
  if (createReviewRes.success) {
    testReviewId = createReviewRes.data._id;
    console.log('✅ Review created successfully');
    console.log('   Review ID:', testReviewId);
  } else {
    console.error('❌ Review creation failed:', createReviewRes.error);
    // Continue with other tests even if review creation fails
  }

  // 5. Test getting reviews for product
  console.log('\n4. Testing get reviews for product...');
  const getReviewsRes = await authRequest('', 'GET', `/products/${testProductId}/reviews`);
  if (getReviewsRes.success) {
    console.log(`✅ Retrieved ${getReviewsRes.data.length} reviews for product`);
    if (getReviewsRes.data.length > 0) {
      console.log('   First review:', getReviewsRes.data[0].comment.substring(0, 50) + '...');
    }
  } else {
    console.error('❌ Failed to get reviews:', getReviewsRes.error);
  }

  // 6. Test updating a review
  console.log('\n5. Testing review update...');
  const updateReviewRes = await authRequest(user1Token, 'PUT', `/reviews/${testReviewId}`, {
    rating: 4,
    comment: 'Updated review - still great but had a small issue',
    userId: user1LoginRes.data.user._id
  });
  
  if (updateReviewRes.success) {
    console.log('✅ Review updated successfully');
    console.log('   Updated comment:', updateReviewRes.data.comment);
  } else {
    console.error('❌ Review update failed:', updateReviewRes.error);
  }

  // 7. Test admin review management
  console.log('\n6. Testing admin review management...');
  const adminReviewRes = await authRequest(adminToken, 'GET', '/admin/reviews');
  if (adminReviewRes.success) {
    console.log(`✅ Admin retrieved ${adminReviewRes.data.length} reviews`);
  } else {
    console.error('❌ Failed to get reviews as admin:', adminReviewRes.error);
  }

  // 8. Test messaging system - Login as user 2
  console.log('\n7. Testing messaging system...');
  console.log('   Logging in as user 2...');
  const user2LoginRes = await authRequest('', 'POST', '/auth/login', {
    email: testUser2.email,
    password: testUser2.password
  });

  if (user2LoginRes.success) {
    user2Token = user2LoginRes.data.token;
    console.log('   ✅ User 2 login successful');
    
    // 9. Send a message from user 1 to user 2
    console.log('   Sending a message from user 1 to user 2...');
    const messageData = {
      receiverId: user2LoginRes.data.user._id,
      text: 'Hello, this is a test message!',
      productId: testProductId,
      senderName: 'User 1',
      receiverName: 'User 2'
    };

    const sendMessageRes = await authRequest(user1Token, 'POST', '/messages/send', messageData);
    if (sendMessageRes.success) {
      testMessageThreadId = sendMessageRes.data.threadId;
      console.log('   ✅ Message sent successfully');
      console.log('      Thread ID:', testMessageThreadId);
      
      // 10. Get conversation between users
      console.log('   Getting conversation between users...');
      const getConvoRes = await authRequest(
        user1Token, 
        'GET', 
        `/messages/conversation/${user2LoginRes.data.user._id}`
      );
      
      if (getConvoRes.success) {
        console.log(`   ✅ Retrieved ${getConvoRes.data.length} messages in conversation`);
      } else {
        console.error('   ❌ Failed to get conversation:', getConvoRes.error);
      }
    } else {
      console.error('   ❌ Failed to send message:', sendMessageRes.error);
    }
    
    // 11. Test getting user's conversations
    console.log('   Getting user 1\'s conversations...');
    const getConvosRes = await authRequest(user1Token, 'GET', '/messages/conversations');
    if (getConvosRes.success) {
      console.log(`   ✅ User 1 has ${getConvosRes.data.length} conversations`);
    } else {
      console.error('   ❌ Failed to get conversations:', getConvosRes.error);
    }
  } else {
    console.error('   ❌ User 2 login failed:', user2LoginRes.error);
  }

  // 12. Test admin message management
  console.log('\n8. Testing admin message management...');
  const adminMessagesRes = await authRequest(adminToken, 'GET', '/admin/messages/conversations');
  if (adminMessagesRes.success) {
    console.log(`✅ Admin retrieved ${adminMessagesRes.data.length} conversations`);
  } else {
    console.error('❌ Failed to get conversations as admin:', adminMessagesRes.error);
  }

  console.log('\n🎉 All tests for Member 5 completed!');
  
  // Note: Clean up test data in a real scenario
  console.log('\n⚠️ Note: Test data cleanup may be needed');
  console.log(`- Review ID to delete: ${testReviewId}`);
  console.log(`- Product ID to delete: ${testProductId}`);
}

// Run the tests
runTests().catch(console.error);
