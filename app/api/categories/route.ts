import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import Category from '@/lib/db/models/Category'
import mongoose from 'mongoose'

// GET /api/categories - list active categories (public)
export async function GET() {
  try {
    await connectDB()
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 })
      .lean()
    return NextResponse.json({ success: true, data: { categories } })
  } catch (err) {
    console.error('List categories error:', err)
    return NextResponse.json({ success: false, error: 'Failed to list categories' }, { status: 500 })
  }
}

interface CreateCategoryBody {
  name: string
  description?: string
  parentCategory?: string | null
}

// POST /api/categories - create category (admin only)
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Admin check via session first
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin privileges required' }, { status: 403 })
    }

    const body: CreateCategoryBody = await request.json()
    const { name, description, parentCategory } = body

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 })
    }

    let parent: mongoose.Types.ObjectId | null = null
    if (parentCategory) {
      if (!mongoose.Types.ObjectId.isValid(parentCategory)) {
        return NextResponse.json({ success: false, error: 'Invalid parent category ID' }, { status: 400 })
      }
      parent = new mongoose.Types.ObjectId(parentCategory)
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim(),
      parentCategory: parent ?? null,
      isActive: true,
    })

    return NextResponse.json({ success: true, message: 'Category created', data: { category } }, { status: 201 })
  } catch (err) {
    console.error('Create category error:', err)
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 })
  }
}
