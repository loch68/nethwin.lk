require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../src/models/Product');

async function removeApiTestProduct() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { 
      serverSelectionTimeoutMS: 5000,
      useNewUrlParser: true,
      useUnifiedTopology: true 
    });
    
    console.log('Connected to MongoDB');

    // Search for products with "API" in the name (case insensitive)
    const apiProducts = await Product.find({
      name: { $regex: /api/i }
    });

    console.log(`Found ${apiProducts.length} products with "API" in the name:`);
    
    if (apiProducts.length === 0) {
      console.log('No API test products found in the database.');
      await mongoose.disconnect();
      return;
    }

    // Display found products
    apiProducts.forEach((product, index) => {
      console.log(`${index + 1}. ID: ${product._id}`);
      console.log(`   Name: ${product.name}`);
      console.log(`   Category: ${product.category}`);
      console.log(`   Price: ${product.sellingPrice}`);
      console.log(`   Stock: ${product.stock}`);
      console.log('---');
    });

    // Remove all API test products
    const deleteResult = await Product.deleteMany({
      name: { $regex: /api/i }
    });

    console.log(`Successfully removed ${deleteResult.deletedCount} API test products from the database.`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('Error removing API test product:', error);
    process.exit(1);
  }
}

// Run the script
removeApiTestProduct();
