// Quick test script to debug analytics
const mongoose = require('mongoose');
require('dotenv').config();

async function testAnalytics() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/theplug';
    console.log('Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);
    
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
    const ProductEvent = mongoose.model('ProductEvent', new mongoose.Schema({}, { strict: false }));
    
    console.log('=== Products with counters ===');
    const products = await Product.find({}).select('_id name views addToCartCount purchaseCount popularityScore').limit(5);
    products.forEach(p => {
      console.log(`${p.name}: views=${p.views}, adds=${p.addToCartCount}, purchases=${p.purchaseCount}, score=${p.popularityScore}`);
    });
    
    console.log('\n=== ProductEvents ===');
    const events = await ProductEvent.find({}).sort({ createdAt: -1 }).limit(10);
    events.forEach(e => {
      console.log(`${e.productId}: ${e.type} qty=${e.quantity} at ${e.createdAt}`);
    });
    
    console.log('\n=== Event totals by product ===');
    const totals = await ProductEvent.aggregate([
      { $group: { _id: { productId: '$productId', type: '$type' }, total: { $sum: { $ifNull: ['$quantity', 1] } } } },
      { $group: { _id: '$_id.productId', views: { $sum: { $cond: [{ $eq: ['$_id.type', 'view'] }, '$total', 0] } }, adds: { $sum: { $cond: [{ $eq: ['$_id.type', 'add_to_cart'] }, '$total', 0] } }, purchases: { $sum: { $cond: [{ $eq: ['$_id.type', 'purchase'] }, '$total', 0] } } } }
    ]);
    totals.forEach(t => {
      console.log(`${t._id}: views=${t.views}, adds=${t.adds}, purchases=${t.purchases}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testAnalytics();
