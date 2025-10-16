const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testInventoryUpdate() {
  try {
    console.log('🧪 Testing inventory update functionality...');

    // Step 1: Create a test product with stock
    const testProduct = new Product({
      productId: 'TEST-INVENTORY-001',
      name: 'Test Product for Inventory',
      category: 'Test',
      brand: 'Test Brand',
      sellingPrice: 100,
      purchasePrice: 50,
      stock: 10,
      description: 'Test product for inventory management',
      images: ['test-image.jpg'],
      status: 'active'
    });

    await testProduct.save();
    console.log(`✅ Created test product with ID: ${testProduct._id}`);
    console.log(`   Initial stock: ${testProduct.stock}`);

    // Step 2: Create a test order with this product
    const testOrder = {
      type: 'shop',
      items: [
        {
          id: testProduct._id.toString(),
          name: testProduct.name,
          price: testProduct.sellingPrice,
          qty: 3,
          image: testProduct.images[0]
        }
      ],
      total: testProduct.sellingPrice * 3,
      status: 'pending',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '1234567890',
      deliveryMethod: 'Local Delivery',
      paymentMethod: 'Cash on Delivery',
      orderNumber: 'TEST-ORD-' + Date.now()
    };

    // Step 3: Simulate the order creation process (like the API does)
    console.log('\n📦 Simulating order creation...');
    
    // Update product stock for each item in the order
    if (Array.isArray(testOrder.items) && testOrder.items.length > 0) {
      console.log('Updating product stock for order items...');
      
      for (const item of testOrder.items) {
        const productId = item.id;
        const quantity = parseInt(item.qty || 1);
        
        if (productId && quantity > 0) {
          // Find the product and update stock
          const product = await Product.findById(productId);
          
          if (product) {
            const currentStock = parseInt(product.stock || 0);
            const newStock = Math.max(0, currentStock - quantity);
            
            await Product.findByIdAndUpdate(productId, {
              $set: { stock: newStock }
            });
            
            console.log(`   Updated stock for product ${productId}: ${currentStock} -> ${newStock} (ordered: ${quantity})`);
          }
        }
      }
    }

    // Create the order
    const createdOrder = await Order.create(testOrder);
    console.log(`✅ Order created successfully: ${createdOrder.orderNumber}`);

    // Step 4: Verify the stock was updated
    const updatedProduct = await Product.findById(testProduct._id);
    console.log(`\n📊 Stock verification:`);
    console.log(`   Original stock: 10`);
    console.log(`   Ordered quantity: 3`);
    console.log(`   Expected new stock: 7`);
    console.log(`   Actual new stock: ${updatedProduct.stock}`);

    if (updatedProduct.stock === 7) {
      console.log('✅ INVENTORY UPDATE TEST PASSED!');
    } else {
      console.log('❌ INVENTORY UPDATE TEST FAILED!');
    }

    // Step 5: Test order cancellation (stock restoration)
    console.log('\n🔄 Testing order cancellation and stock restoration...');
    
    // Simulate order cancellation
    if (Array.isArray(createdOrder.items) && createdOrder.items.length > 0) {
      console.log('Restoring product stock for cancelled order...');
      
      for (const item of createdOrder.items) {
        const productId = item.id;
        const quantity = parseInt(item.qty || 1);
        
        if (productId && quantity > 0) {
          const product = await Product.findById(productId);
          
          if (product) {
            const currentStock = parseInt(product.stock || 0);
            const newStock = currentStock + quantity;
            
            await Product.findByIdAndUpdate(productId, {
              $set: { stock: newStock }
            });
            
            console.log(`   Restored stock for product ${productId}: ${currentStock} -> ${newStock} (restored: ${quantity})`);
          }
        }
      }
    }

    // Update order status to cancelled
    createdOrder.status = 'cancelled';
    createdOrder.cancelledAt = new Date();
    await createdOrder.save();

    // Step 6: Verify stock was restored
    const restoredProduct = await Product.findById(testProduct._id);
    console.log(`\n📊 Stock restoration verification:`);
    console.log(`   Stock after order: 7`);
    console.log(`   Restored quantity: 3`);
    console.log(`   Expected final stock: 10`);
    console.log(`   Actual final stock: ${restoredProduct.stock}`);

    if (restoredProduct.stock === 10) {
      console.log('✅ STOCK RESTORATION TEST PASSED!');
    } else {
      console.log('❌ STOCK RESTORATION TEST FAILED!');
    }

    // Cleanup: Remove test data
    await Product.findByIdAndDelete(testProduct._id);
    await Order.findByIdAndDelete(createdOrder._id);
    console.log('\n🧹 Cleaned up test data');

    console.log('\n🎉 INVENTORY MANAGEMENT TESTS COMPLETED!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testInventoryUpdate();
