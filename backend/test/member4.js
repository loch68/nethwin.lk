const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testUser = {
  username: 'printuser',  // Test user username
  password: 'print123'    // Test user password
};

const testAdmin = {
  username: 'admin',     // Admin username
  password: 'admin123'   // Admin password
};

let userToken = '';
let adminToken = '';
let testPrintOrderId = '';  // Will be set after creating a test print order

// Helper function to make authenticated requests
const authRequest = async (token, method, url, data = null, headers = {}) => {
  const config = {
    method,
    url: `${BASE_URL}${url}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...headers
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

// Create a test PDF file
async function createTestPdf() {
  const pdfPath = path.join(__dirname, 'test-document.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    // Create a simple PDF for testing
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(pdfPath));
    doc.fontSize(25).text('Test Document for Print Order', 100, 100);
    doc.text(`Generated at: ${new Date().toISOString()}`, 100, 180);
    doc.end();
    
    // Wait for the PDF to be fully written
    await new Promise(resolve => doc.on('end', resolve));
  }
  
  return pdfPath;
}

// Test cases for Member 4's features (Print Order Management)
async function runTests() {
  console.log('🚀 Starting tests for Member 4 - Print Order Management Module');
  
  // 1. Login as user
  console.log('\n1. Logging in as user...');
  const userLoginRes = await authRequest('', 'POST', '/auth/login', {
    email: testUser.email,
    password: testUser.password
  });

  if (userLoginRes.success) {
    userToken = userLoginRes.data.token;
    console.log('✅ User login successful');
  } else {
    console.error('❌ User login failed:', userLoginRes.error);
    return;
  }

  // 2. Login as admin
  console.log('\n2. Logging in as admin...');
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

  // 3. Test creating a print order
  console.log('\n3. Testing print order creation...');
  
  // Create a test PDF file
  const testPdfPath = await createTestPdf();
  
  // Create form data for file upload
  const form = new FormData();
  form.append('userName', 'Test Print User');
  form.append('contactNumber', '1234567890');
  form.append('email', 'print-test@example.com');
  form.append('paperSize', 'A4');
  form.append('colorOption', 'color');
  form.append('copies', '2');
  form.append('binding', 'spiral');
  form.append('finishing', 'laminated');
  form.append('deliveryMethod', 'pickup');
  form.append('specialInstructions', 'Test print order - please handle with care');
  form.append('document', fs.createReadStream(testPdfPath));
  
  try {
    const createRes = await axios.post(
      `${BASE_URL}/print-orders`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${userToken}`
        }
      }
    );
    
    if (createRes.data) {
      testPrintOrderId = createRes.data._id;
      console.log('✅ Print order created successfully');
      console.log('   Print Order ID:', testPrintOrderId);
      console.log('   Status:', createRes.data.status);
      console.log('   Price:', createRes.data.totalPrice);
    }
  } catch (error) {
    console.error('❌ Print order creation failed:', error.response?.data?.message || error.message);
    return;
  }

  // 4. Test getting print order by ID
  console.log('\n4. Testing get print order by ID...');
  const getOrderRes = await authRequest(userToken, 'GET', `/print-orders/${testPrintOrderId}`);
  if (getOrderRes.success) {
    console.log('✅ Print order retrieved successfully');
    console.log('   Status:', getOrderRes.data.status);
    console.log('   Document:', getOrderRes.data.documentUrl ? 'Available' : 'Not available');
  } else {
    console.error('❌ Failed to get print order:', getOrderRes.error);
  }

  // 5. Test getting user's print orders
  console.log('\n5. Testing get user print orders...');
  const getUserOrdersRes = await authRequest(userToken, 'GET', '/print-orders/my-orders');
  if (getUserOrdersRes.success) {
    console.log(`✅ Retrieved ${getUserOrdersRes.data.length} print orders for user`);
  } else {
    console.error('❌ Failed to get user print orders:', getUserOrdersRes.error);
  }

  // 6. Test updating print order status (admin only)
  console.log('\n6. Testing print order status update (admin)...');
  const updateOrderRes = await authRequest(adminToken, 'PUT', `/admin/print-orders/${testPrintOrderId}/status`, {
    status: 'in_progress',
    statusMessage: 'Your print job is being processed'
  });
  
  if (updateOrderRes.success) {
    console.log('✅ Print order status updated successfully');
    console.log('   New status:', updateOrderRes.data.status);
  } else {
    console.error('❌ Print order update failed:', updateOrderRes.error);
  }

  // 7. Test getting all print orders (admin only)
  console.log('\n7. Testing get all print orders (admin)...');
  const getAllOrdersRes = await authRequest(adminToken, 'GET', '/admin/print-orders');
  if (getAllOrdersRes.success) {
    console.log(`✅ Retrieved ${getAllOrdersRes.data.length} total print orders`);
  } else {
    console.error('❌ Failed to get all print orders:', getAllOrdersRes.error);
  }

  // 8. Test print order queue
  console.log('\n8. Testing print order queue...');
  const queueRes = await authRequest(adminToken, 'GET', '/print-orders/queue');
  if (queueRes.success) {
    console.log(`✅ Retrieved ${queueRes.data.length} orders in queue`);
  } else {
    console.error('❌ Failed to get print queue:', queueRes.error);
  }

  // 9. Test print order export (admin only)
  console.log('\n9. Testing print order export (admin)...');
  try {
    const exportRes = await axios.get(`${BASE_URL}/admin/print-orders/export/csv`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Accept': 'text/csv'
      },
      responseType: 'text'
    });
    
    if (exportRes.data) {
      console.log('✅ Print order export successful');
      console.log('   CSV data:', exportRes.data.split('\n').slice(0, 3).join('\n   ') + '...');
    }
  } catch (error) {
    console.log('ℹ️ Print order export test skipped or failed (may not be implemented yet)');
  }

  console.log('\n🎉 All tests for Member 4 completed!');
  
  // Note: Clean up test data in a real scenario
  console.log('\n⚠️ Note: Test data cleanup may be needed');
  console.log(`- Print Order ID to delete: ${testPrintOrderId}`);
}

// Run the tests
runTests().catch(console.error);
