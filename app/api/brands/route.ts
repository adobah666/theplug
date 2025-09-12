import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Product from '@/lib/db/models/Product';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Aggregate brands from products
    const brandAggregation = await Product.aggregate([
      {
        $match: {
          brand: { $exists: true, $nin: [null, ''] }
        }
      },
      {
        $group: {
          _id: '$brand',
          productCount: { $sum: 1 },
          // Get first product image for brand representation
          sampleProduct: { $first: '$$ROOT' }
        }
      },
      // Only keep brands that actually have products
      { $match: { productCount: { $gt: 0 } } },
      {
        $project: {
          name: '$_id',
          slug: {
            $toLower: {
              $replaceAll: {
                input: '$_id',
                find: ' ',
                replacement: '-'
              }
            }
          },
          productCount: 1,
          description: {
            $concat: [
              'Discover the latest collection from ',
              '$_id',
              '. Quality fashion and innovative designs.'
            ]
          }
        }
      },
      {
        $sort: { productCount: -1 }
      }
    ]);

    const brands = brandAggregation.map(brand => ({
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      productCount: brand.productCount
    }));

    return NextResponse.json({
      success: true,
      brands
    });

  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch brands' 
      },
      { status: 500 }
    );
  }
}