import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import Category from '@/lib/db/models/Category'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const categoryParam = searchParams.get('category') || undefined

    const match: any = {}
    let categoryId: mongoose.Types.ObjectId | undefined

    if (categoryParam) {
      if (mongoose.Types.ObjectId.isValid(categoryParam)) {
        categoryId = new mongoose.Types.ObjectId(categoryParam)
      } else {
        const cat = await Category
          .findOne({ slug: categoryParam.toLowerCase() })
          .select('_id')
          .lean<{ _id: mongoose.Types.ObjectId }>()
        if (cat?._id) categoryId = cat._id
      }
      if (categoryId) match.category = categoryId
    }

    // Aggregate categories with counts
    const categoriesAgg = await Product.aggregate([
      { $match: match },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $project: { _id: 0, id: '$category._id', name: '$category.name', slug: '$category.slug', count: 1 } },
      { $sort: { name: 1 } }
    ])

    // Aggregate brands
    const brandsAgg = await Product.aggregate([
      { $match: match },
      { $match: { brand: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $project: { _id: 0, name: '$_id', count: 1 } },
      { $sort: { name: 1 } }
    ])

    // Aggregate sizes from variants
    const sizesAgg = await Product.aggregate([
      { $match: match },
      { $unwind: '$variants' },
      { $match: { 'variants.size': { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: { $toLower: '$variants.size' }, count: { $sum: 1 } } },
      { $project: { _id: 0, value: '$_id', count: 1 } },
      { $sort: { value: 1 } }
    ])

    // Aggregate colors from variants
    const colorsAgg = await Product.aggregate([
      { $match: match },
      { $unwind: '$variants' },
      { $match: { 'variants.color': { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: { $toLower: '$variants.color' }, count: { $sum: 1 } } },
      { $project: { _id: 0, value: '$_id', count: 1 } },
      { $sort: { value: 1 } }
    ])

    return NextResponse.json({
      success: true,
      data: {
        categories: categoriesAgg,
        brands: brandsAgg,
        sizes: sizesAgg,
        colors: colorsAgg,
      }
    })
  } catch (err) {
    console.error('Facets error:', err)
    return NextResponse.json({ success: false, error: 'Failed to load facets' }, { status: 500 })
  }
}
