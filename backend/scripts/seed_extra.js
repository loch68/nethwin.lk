require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Review = require('../src/models/Review');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://Cluster28608:nethwinlk@cluster28608.qqqrppl.mongodb.net/bookstore';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  // Seed Users
  const users = [
    { fullName: 'Jane Admin', username: 'admin', email: 'admin@example.com', phone: '+94 700000001', status: 'active', role: 'admin' },
    { fullName: 'John Customer', username: 'john', email: 'john@example.com', phone: '+94 700000002', status: 'active', role: 'customer' },
    { fullName: 'Mary Customer', username: 'mary', email: 'mary@example.com', phone: '+94 700000003', status: 'inactive', role: 'customer' },
  ];
  await User.deleteMany({});
  const insertedUsers = await User.insertMany(users);

  // Seed Orders (shop & print)
  const orders = [
    { type: 'shop', items: [], total: 3500, status: 'to-fulfill', customerName: 'John Customer', customerEmail: 'john@example.com', meta: {} },
    { type: 'print', items: [], total: 0, status: 'in-progress', customerName: 'Mary Customer', customerEmail: 'mary@example.com', meta: { documentName: 'Thesis', paperSize: 'A4', color: 'Color', binding: 'Spiral', copies: 2, finishing: 'Glossy', delivery: 'Home' } },
  ];
  await Order.deleteMany({});
  const insertedOrders = await Order.insertMany(orders);

  // Seed Reviews (with placeholder productName)
  const reviews = [
    { productName: 'Sample Product', author: 'John', rating: 5, comment: 'Great!' },
    { productName: 'Sample Product 2', author: 'Mary', rating: 4, comment: 'Nice quality.' },
  ];
  await Review.deleteMany({});
  const insertedReviews = await Review.insertMany(reviews);

  console.log(`Seeded users: ${insertedUsers.length}, orders: ${insertedOrders.length}, reviews: ${insertedReviews.length}`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });


