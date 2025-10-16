const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const WishlistData = require('../src/models/WishlistData');
const WishlistTracking = require('../src/models/WishlistTracking');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function seedWishlistData() {
  try {
    console.log('🌱 Seeding wishlist data...');

    // Clear existing data
    await WishlistData.deleteMany({});
    await WishlistTracking.deleteMany({});

    // Sample product IDs (you should replace these with actual product IDs from your database)
    const sampleProducts = [
      {
        id: '507f1f77bcf86cd799439011', // Replace with actual product ID
        name: 'Advanced Mathematics Textbook',
        price: 2500,
        category: 'Books',
        image: '../assets/book1.jpg'
      },
      {
        id: '507f1f77bcf86cd799439012', // Replace with actual product ID
        name: 'Physics for Engineers',
        price: 2000,
        category: 'Books',
        image: '../assets/book2.jpg'
      },
      {
        id: '507f1f77bcf86cd799439013', // Replace with actual product ID
        name: 'Premium Notebook Set',
        price: 500,
        category: 'Stationery',
        image: '../assets/notebook.jpg'
      },
      {
        id: '507f1f77bcf86cd799439014', // Replace with actual product ID
        name: 'Computer Science Fundamentals',
        price: 3200,
        category: 'Books',
        image: '../assets/book3.jpg'
      },
      {
        id: '507f1f77bcf86cd799439015', // Replace with actual product ID
        name: 'Professional Pen Collection',
        price: 750,
        category: 'Stationery',
        image: '../assets/pens.jpg'
      }
    ];

    // Create sample users with wishlists
    const sampleWishlists = [
      {
        userId: 'user_001',
        wishlist: [
          { ...sampleProducts[0], addedAt: new Date('2025-01-10') },
          { ...sampleProducts[1], addedAt: new Date('2025-01-12') },
          { ...sampleProducts[2], addedAt: new Date('2025-01-15') }
        ]
      },
      {
        userId: 'user_002',
        wishlist: [
          { ...sampleProducts[0], addedAt: new Date('2025-01-11') },
          { ...sampleProducts[3], addedAt: new Date('2025-01-13') }
        ]
      },
      {
        userId: 'user_003',
        wishlist: [
          { ...sampleProducts[0], addedAt: new Date('2025-01-14') },
          { ...sampleProducts[1], addedAt: new Date('2025-01-16') },
          { ...sampleProducts[4], addedAt: new Date('2025-01-17') }
        ]
      },
      {
        userId: 'user_004',
        wishlist: [
          { ...sampleProducts[2], addedAt: new Date('2025-01-15') },
          { ...sampleProducts[3], addedAt: new Date('2025-01-18') }
        ]
      },
      {
        userId: 'user_005',
        wishlist: [
          { ...sampleProducts[0], addedAt: new Date('2025-01-16') }
        ]
      }
    ];

    // Insert wishlist data
    for (const wishlistData of sampleWishlists) {
      await WishlistData.create(wishlistData);
      console.log(`✅ Created wishlist for ${wishlistData.userId} with ${wishlistData.wishlist.length} items`);
    }

    // Create tracking data
    const trackingData = [];
    for (const wishlistData of sampleWishlists) {
      for (const item of wishlistData.wishlist) {
        trackingData.push({
          userId: wishlistData.userId,
          productId: item.id,
          action: 'add',
          timestamp: item.addedAt,
          productData: {
            name: item.name,
            price: item.price,
            category: item.category,
            image: item.image
          }
        });
      }
    }

    await WishlistTracking.insertMany(trackingData);
    console.log(`✅ Created ${trackingData.length} tracking entries`);

    console.log('🎉 Wishlist data seeding completed!');
    console.log('\nSummary:');
    console.log(`- ${sampleWishlists.length} users with wishlists`);
    console.log(`- ${trackingData.length} total wishlist items`);
    console.log(`- Most popular product: ${sampleProducts[0].name} (appears in 3 wishlists)`);

  } catch (error) {
    console.error('❌ Error seeding wishlist data:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the seeding
seedWishlistData();
