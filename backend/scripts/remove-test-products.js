const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Product = require('../src/models/Product');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function removeTestProducts() {
  try {
    console.log('🧹 Removing test products...');

    // Find and remove the specific test product
    const testProduct = await Product.findOne({ productId: 'API-TEST-INVENTORY-001' });
    
    if (testProduct) {
      console.log(`Found test product: ${testProduct.name}`);
      console.log(`Product ID: ${testProduct._id}`);
      console.log(`Product Code: ${testProduct.productId}`);
      
      await Product.findByIdAndDelete(testProduct._id);
      console.log('✅ Test product removed successfully');
    } else {
      console.log('ℹ️ Test product not found in database');
    }

    // Also remove any other test products that might exist
    const otherTestProducts = await Product.find({
      $or: [
        { productId: { $regex: /^TEST-/, $options: 'i' } },
        { productId: { $regex: /^API-TEST-/, $options: 'i' } },
        { name: { $regex: /test.*inventory/i } },
        { name: { $regex: /API.*test/i } }
      ]
    });

    if (otherTestProducts.length > 0) {
      console.log(`\n🔍 Found ${otherTestProducts.length} other test products:`);
      
      for (const product of otherTestProducts) {
        console.log(`   - ${product.name} (${product.productId})`);
        await Product.findByIdAndDelete(product._id);
        console.log(`     ✅ Removed`);
      }
    } else {
      console.log('\nℹ️ No other test products found');
    }

    console.log('\n🎉 Cleanup completed!');

  } catch (error) {
    console.error('❌ Error removing test products:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the cleanup
removeTestProducts();
