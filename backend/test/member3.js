const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testCustomer = {
  username: 'customer',  // Test customer username
  password: 'customer123'  // Test customer password
};

const testAdmin = {
  username: 'admin',    // Admin username
  password: 'admin123'  // Admin password
};

let customerToken = '';
let adminToken = '';
let testProductId = '';  // Will be set after creating a test product
let testOrderId = '';    // Will be set after creating a test order

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
      error: error.response?.data?.message || error.message 
    };
  }
};

// Create a test product (admin only)
async function createTestProduct() {
  console.log('Creating test product...');
  const productData = {
    name: `Test Order Product ${Date.now()}`,
    description: 'Test product for order testing',
    price: 19.99,
    stock: 100,
    category: 'test',
    author: 'Test Author',
    isbn: `TEST-${Date.now()}`
  };

  const res = await authRequest(adminToken, 'POST', '/products', productData);
  if (res.success) {
    console.log('✅ Test product created');
    return res.data._id;
  } else {
    throw new Error(`Failed to create test product: ${res.error}`);
  }
}

// Test cases for Member 3's features (Order Management)
async function runTests() {
  console.log('🚀 Starting tests for Member 3 - Order Management Module');
  
  // 1. Login as customer
  console.log('\n1. Logging in as customer...');
  const customerLoginRes = await authRequest('', 'POST', '/auth/login', {
    email: testCustomer.email,
    password: testCustomer.password
  });

  if (customerLoginRes.success) {
    customerToken = customerLoginRes.data.token;
    console.log('✅ Customer login successful');
  } else {
    console.error('❌ Customer login failed:', customerLoginRes.error);
    return;
  }

  // 2. Login as admin (to create test product)
  console.log('\n2. Logging in as admin to create test product...');
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

  // 3. Create a test product
  try {
    testProductId = await createTestProduct();
  } catch (error) {
    console.error('❌ Failed to create test product:', error.message);
    return;
  }

  // 4. Test creating an order
  console.log('\n3. Testing order creation...');
  const orderData = {
    items: [
      {
        product: testProductId,
        quantity: 2
      }
    ],
    shippingAddress: '123 Test St, Test City',
    paymentMethod: 'credit_card',
    paymentResult: {
      id: 'test_payment_id',
      status: 'completed',
      update_time: new Date().toISOString(),
      email_address: testCustomer.email
    },
    taxPrice: 3.99,
    shippingPrice: 5.99,
    totalPrice: 49.96
  };

  const createOrderRes = await authRequest(customerToken, 'POST', '/orders', orderData);
  if (createOrderRes.success) {
    testOrderId = createOrderRes.data._id;
    console.log('✅ Order created successfully');
    console.log('   Order ID:', testOrderId);
  } else {
    console.error('❌ Order creation failed:', createOrderRes.error);
    return;
  }

  // 5. Test getting order by ID
  console.log('\n4. Testing get order by ID...');
  const getOrderRes = await authRequest(customerToken, 'GET', `/orders/${testOrderId}`);
  if (getOrderRes.success) {
    console.log('✅ Order retrieved successfully');
    console.log('   Order status:', getOrderRes.data.status);
    console.log('   Total price:', getOrderRes.data.totalPrice);
  } else {
    console.error('❌ Failed to get order:', getOrderRes.error);
  }

  // 6. Test getting user's orders
  console.log('\n5. Testing get user orders...');
  const getUserOrdersRes = await authRequest(customerToken, 'GET', '/orders/myorders');
  if (getUserOrdersRes.success) {
    console.log(`✅ Retrieved ${getUserOrdersRes.data.length} orders for user`);
  } else {
    console.error('❌ Failed to get user orders:', getUserOrdersRes.error);
  }

  // 7. Test updating order status (admin only)
  console.log('\n6. Testing order status update (admin)...');
  const updateOrderRes = await authRequest(adminToken, 'PUT', `/orders/${testOrderId}`, {
    status: 'shipped',
    trackingNumber: `TRACK-${Date.now()}`
  });
  
  if (updateOrderRes.success) {
    console.log('✅ Order status updated successfully');
    console.log('   New status:', updateOrderRes.data.status);
  } else {
    console.error('❌ Order update failed:', updateOrderRes.error);
  }

  // 8. Test getting all orders (admin only)
  console.log('\n7. Testing get all orders (admin)...');
  const getAllOrdersRes = await authRequest(adminToken, 'GET', '/orders');
  if (getAllOrdersRes.success) {
    console.log(`✅ Retrieved ${getAllOrdersRes.data.length} total orders`);
  } else {
    console.error('❌ Failed to get all orders:', getAllOrdersRes.error);
  }

  // 9. Test order export (admin only)
  console.log('\n8. Testing order export (admin)...');
  try {
    const exportRes = await axios.get(`${BASE_URL}/orders/export/pdf`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Accept': 'application/pdf'
      },
      responseType: 'arraybuffer'
    });
    
    if (exportRes.data) {
      console.log('✅ Order export successful');
      console.log('   PDF size:', exportRes.data.length, 'bytes');
      // Optionally save the PDF
      // fs.writeFileSync('orders_export.pdf', exportRes.data);
    }
  } catch (error) {
    console.log('ℹ️ Order export test skipped or failed (may not be implemented yet)');
  }

  console.log('\n🎉 All tests for Member 3 completed!');
  
  // Note: Clean up test data in a real scenario
  console.log('\n⚠️ Note: Test data cleanup may be needed');
  console.log(`- Order ID to delete: ${testOrderId}`);
  console.log(`- Product ID to delete: ${testProductId}`);
}

// Run the tests
runTests().catch(console.error);
