require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../src/models/Product');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nethwin_shop';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const result = await Product.deleteMany({});
  console.log(`Deleted ${result.deletedCount} products.`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });


