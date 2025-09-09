import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import Category from '@/lib/db/models/Category'
import { ApiResponse } from '@/types'
import mongoose from 'mongoose'
import { initializeClient, getProductsIndex } from '@/lib/meilisearch/client'

interface FacetCounts {
  categories: Array<{ value: string; label: string; count: number }>
  brands: Array<{ value: string; label: string; count: number }>
  sizes: Array<{ value: string; label: string; count: number }>
  colors: Array<{ value: string; label: string; count: number }>
  priceRange: { min: number; max: number }
  ratings: Record<string, number>
}

// GET /api/products/search/facets - Get filter facets based on current search/filters
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    
    // Extract current filters (excluding the ones we're calculating facets for)
    const query = searchParams.get('q')
    const currentCategory = searchParams.get('category')
    const currentBrand = searchParams.get('brand')
    const currentSize = searchParams.get('size')
    const currentColor = searchParams.get('color')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const minRating = searchParams.get('minRating')

    // Build base query for all facet calculations
    const baseQuery: any = {}

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      baseQuery.price = {}
      if (minPrice) baseQuery.price.$gte = parseFloat(minPrice)
      if (maxPrice) baseQuery.price.$lte = parseFloat(maxPrice)
    }

    // Rating filter
    if (minRating) {
      baseQuery.rating = { $gte: parseFloat(minRating) }
    }

    // Calculate facets using aggregation pipeline
    // Use a broad type to avoid overly strict PipelineStage typing issues with $facet
    const facetPipeline: any[] = [
      { $match: baseQuery },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      // Apply a regex-based text filter after category lookup so we can match on category fields too
      ...(query ? [{
        $match: {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { brand: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { searchableText: { $regex: query, $options: 'i' } },
            { 'variants.sku': { $regex: query, $options: 'i' } },
            { 'variants.color': { $regex: query, $options: 'i' } },
            { 'variants.size': { $regex: query, $options: 'i' } },
            { 'categoryInfo.name': { $regex: query, $options: 'i' } },
            { 'categoryInfo.slug': { $regex: query, $options: 'i' } }
          ]
        }
      }] : []),
      {
        $facet: {
          // Category facets (exclude current category filter)
          categories: currentCategory ? [] : [
            {
              $group: {
                _id: '$categoryInfo.slug',
                label: { $first: '$categoryInfo.name' },
                count: { $sum: 1 }
              }
            },
            { $match: { _id: { $nin: [null, ''] } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
            {
              $project: {
                value: '$_id',
                label: 1,
                count: 1,
                _id: 0
              }
            }
          ],
          
          // Brand facets (exclude current brand filter)
          brands: currentBrand ? [] : [
            {
              $group: {
                _id: { $toLower: '$brand' },
                label: { $first: '$brand' },
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 20 },
            {
              $project: {
                value: '$_id',
                label: 1,
                count: 1,
                _id: 0
              }
            }
          ],
          
          // Size facets (exclude current size filter)
          sizes: currentSize ? [] : [
            { $unwind: '$variants' },
            {
              $group: {
                _id: { $toLower: '$variants.size' },
                label: { $first: { $toUpper: '$variants.size' } },
                count: { $sum: 1 }
              }
            },
            { $match: { _id: { $nin: [null, ''] } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
            {
              $project: {
                value: '$_id',
                label: 1,
                count: 1,
                _id: 0
              }
            }
          ],
          
          // Color facets (exclude current color filter)
          colors: currentColor ? [] : [
            { $unwind: '$variants' },
            {
              $group: {
                _id: { $toLower: '$variants.color' },
                label: { $first: { $toUpper: '$variants.color' } },
                count: { $sum: 1 }
              }
            },
            { $match: { _id: { $nin: [null, ''] } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
            {
              $project: {
                value: '$_id',
                label: 1,
                count: 1,
                _id: 0
              }
            }
          ],
          
          // Price range
          priceRange: [
            {
              $group: {
                _id: null,
                min: { $min: '$price' },
                max: { $max: '$price' }
              }
            }
          ],
          
          // Rating distribution
          ratings: [
            {
              $bucket: {
                groupBy: '$rating',
                boundaries: [0, 1, 2, 3, 4, 5],
                default: 5,
                output: {
                  count: { $sum: 1 }
                }
              }
            }
          ]
        }
      }
    ]

    // Apply current filters to get accurate facet counts
    if (currentCategory) {
      const category = await Category.findOne({ slug: currentCategory.toLowerCase() })
      if (category) {
        facetPipeline[0].$match.category = category._id
      }
    }

    if (currentBrand) {
      const brands = currentBrand.split(',')
      facetPipeline[0].$match.brand = { 
        $in: brands.map(b => new RegExp(b, 'i'))
      }
    }

    if (currentSize) {
      const sizes = currentSize.split(',')
      facetPipeline[0].$match['variants.size'] = { 
        $in: sizes.map(s => new RegExp(s, 'i'))
      }
    }

    if (currentColor) {
      const colors = currentColor.split(',')
      facetPipeline[0].$match['variants.color'] = { 
        $in: colors.map(c => new RegExp(c, 'i'))
      }
    }

    let [facetResults] = await Product.aggregate(facetPipeline as any)

    // Fallback: if everything is empty, compute basic facets without text filtering
    if (
      facetResults &&
      (!facetResults.categories?.length && !facetResults.brands?.length && !facetResults.sizes?.length && !facetResults.colors?.length)
    ) {
      const fallbackPipeline: any[] = [
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
        {
          $facet: {
            categories: [
              { $group: { _id: '$categoryInfo.slug', label: { $first: '$categoryInfo.name' }, count: { $sum: 1 } } },
              { $match: { _id: { $nin: [null, ''] } } },
              { $sort: { count: -1 } },
              { $limit: 20 },
              { $project: { value: '$_id', label: 1, count: 1, _id: 0 } }
            ],
            brands: [
              { $group: { _id: { $toLower: '$brand' }, label: { $first: '$brand' }, count: { $sum: 1 } } },
              { $match: { _id: { $nin: [null, ''] } } },
              { $sort: { count: -1 } },
              { $limit: 20 },
              { $project: { value: '$_id', label: 1, count: 1, _id: 0 } }
            ],
            sizes: [
              { $unwind: '$variants' },
              { $group: { _id: { $toLower: '$variants.size' }, label: { $first: { $toUpper: '$variants.size' } }, count: { $sum: 1 } } },
              { $match: { _id: { $nin: [null, ''] } } },
              { $sort: { count: -1 } },
              { $limit: 20 },
              { $project: { value: '$_id', label: 1, count: 1, _id: 0 } }
            ],
            colors: [
              { $unwind: '$variants' },
              { $group: { _id: { $toLower: '$variants.color' }, label: { $first: { $toUpper: '$variants.color' } }, count: { $sum: 1 } } },
              { $match: { _id: { $nin: [null, ''] } } },
              { $sort: { count: -1 } },
              { $limit: 20 },
              { $project: { value: '$_id', label: 1, count: 1, _id: 0 } }
            ],
            priceRange: [ { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } } ],
            ratings: [ { $bucket: { groupBy: '$rating', boundaries: [0,1,2,3,4,5], default: 5, output: { count: { $sum: 1 } } } } ]
          }
        }
      ]
      ;[facetResults] = await Product.aggregate(fallbackPipeline as any)
    }

    // Process rating distribution
    const ratingCounts: Record<string, number> = {}
    let totalProducts = 0

    if (facetResults.ratings) {
      facetResults.ratings.forEach((bucket: any) => {
        totalProducts += bucket.count
      })

      // Calculate cumulative counts for "X stars & up"
      let cumulative = 0
      for (let rating = 4; rating >= 1; rating--) {
        const bucket = facetResults.ratings.find((r: any) => r._id >= rating)
        if (bucket) {
          cumulative += bucket.count
        }
        ratingCounts[`${rating}+`] = cumulative
      }
    }

    let facets: FacetCounts = {
      categories: facetResults?.categories || [],
      brands: facetResults?.brands || [],
      sizes: facetResults?.sizes || [],
      colors: facetResults?.colors || [],
      priceRange: (facetResults?.priceRange && facetResults.priceRange[0]) || { min: 0, max: 100000 },
      ratings: ratingCounts
    }

    // If Mongo yielded empty facets, fall back to Meilisearch facetDistribution
    if (
      facets.categories.length === 0 &&
      facets.brands.length === 0 &&
      facets.sizes.length === 0 &&
      facets.colors.length === 0
    ) {
      try {
        await initializeClient()
        const index = getProductsIndex()
        const ms = await index.search('', {
          facets: ['category', 'brand', 'variants.size', 'variants.color'],
          limit: 0
        })
        const cat = ms.facetDistribution?.['category'] || {}
        const br = ms.facetDistribution?.['brand'] || {}
        const sz = ms.facetDistribution?.['variants.size'] || {}
        const co = ms.facetDistribution?.['variants.color'] || {}

        facets = {
          ...facets,
          categories: Object.entries(cat).map(([value, count]: any) => ({ value, label: value, count } as any)),
          brands: Object.entries(br).map(([value, count]: any) => ({ value: String(value).toLowerCase(), label: String(value), count } as any)),
          sizes: Object.entries(sz).map(([value, count]: any) => ({ value: String(value).toLowerCase(), label: String(value).toUpperCase(), count } as any)),
          colors: Object.entries(co).map(([value, count]: any) => ({ value: String(value).toLowerCase(), label: String(value).toUpperCase(), count } as any))
        }
      } catch (e) {
        // If Meilisearch is unavailable, keep Mongo facets
        console.warn('Meilisearch facets fallback failed:', e)
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: facets
    })

  } catch (error) {
    console.error('Facets calculation error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to calculate filter facets'
    }, { status: 500 })
  }
}