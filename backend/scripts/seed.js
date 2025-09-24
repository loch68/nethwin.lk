require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Product = require('../src/models/Product');

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://Cluster28608:nethwinlk@cluster28608.qqqrppl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster28608';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  const dataPath = path.join(__dirname, '..', '..', 'data', 'products.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const items = JSON.parse(raw).filter((p) => p && p.name);

  const docs = items.map((p) => ({
    name: p.name || 'Unnamed product',
    description: p.description || '',
    image: p.image || '',
    price: Number(p.price) || 0,
    sellingPrice: Number(p.price) || 0,
    unitPurchasePrice: Number(p.purchasePrice) || 0,
    discount: 0,
    sku: p.sku || '',
    brand: p.brand || '',
    category: p.category || '',
    productType: p.type || 'Single',
    tax: Number(p.tax) || 0,
    businessLocation: p.location || '',
    availability: (Number(p.stockQty) || 0) <= 0 ? 'out_of_stock' : (Number(p.stockQty) <= 3 ? 'low_stock' : 'in_stock'),
    currentStock: Number(p.stockQty) || 0,
  }));

  await Product.deleteMany({});
  await Product.insertMany(docs);
  console.log(`Seeded ${docs.length} products.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


