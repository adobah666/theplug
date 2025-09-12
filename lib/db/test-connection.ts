import connectDB from './connection'
import mongoose from 'mongoose'
import { hashPassword, comparePassword, validatePasswordStrength } from '../auth/password'
import { signToken, verifyToken } from '../auth/jwt'

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log('Testing database connection...')
    console.log('MongoDB URI:', process.env.MONGODB_URI)
    
    // Test connection
    await connectDB()
    
    // Test if we can perform a simple operation
    const db = mongoose.connection.db
    if (!db) {
      throw new Error('MongoDB connection is not established')
    }
    const collections = await db.listCollections().toArray()
    console.log('Available collections:', collections.map((c: any) => c.name))
    
    console.log('✅ Database connection test passed')
    return true
  } catch (error) {
    console.error('❌ Database connection test failed:')
    console.error('This is expected if MongoDB is not running locally.')
    console.error('To install and run MongoDB locally:')
    console.error('1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community')
    console.error('2. Install and start the MongoDB service')
    console.error('3. Or use MongoDB Atlas cloud service and update MONGODB_URI in .env.local')
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    return false
  }
}

export async function testPasswordUtilities(): Promise<boolean> {
  try {
    console.log('Testing password utilities...')
    
    const testPassword = 'TestPassword123!'
    
    // Test password validation
    const validation = validatePasswordStrength(testPassword)
    if (!validation.isValid) {
      throw new Error(`Password validation failed: ${validation.errors.join(', ')}`)
    }
    
    // Test password hashing
    const hashedPassword = await hashPassword(testPassword)
    if (!hashedPassword || hashedPassword === testPassword) {
      throw new Error('Password hashing failed')
    }
    
    // Test password comparison
    const isMatch = await comparePassword(testPassword, hashedPassword)
    if (!isMatch) {
      throw new Error('Password comparison failed')
    }
    
    // Test wrong password
    const isWrongMatch = await comparePassword('wrongpassword', hashedPassword)
    if (isWrongMatch) {
      throw new Error('Password comparison should have failed for wrong password')
    }
    
    console.log('✅ Password utilities test passed')
    return true
  } catch (error) {
    console.error('❌ Password utilities test failed:', error)
    return false
  }
}

export async function testJWTUtilities(): Promise<boolean> {
  try {
    console.log('Testing JWT utilities...')
    
    const testPayload = {
      userId: '507f1f77bcf86cd799439011',
      email: 'test@example.com'
    }
    
    // Test token signing
    const token = signToken(testPayload)
    if (!token) {
      throw new Error('Token signing failed')
    }
    
    // Test token verification
    const decoded = verifyToken(token)
    if (decoded.userId !== testPayload.userId || decoded.email !== testPayload.email) {
      throw new Error('Token verification failed')
    }
    
    console.log('✅ JWT utilities test passed')
    return true
  } catch (error) {
    console.error('❌ JWT utilities test failed:', error)
    return false
  }
}

export async function runAllTests(): Promise<void> {
  console.log('🚀 Running core infrastructure tests...\n')
  
  const results = await Promise.allSettled([
    testDatabaseConnection(),
    testPasswordUtilities(),
    testJWTUtilities()
  ])
  
  const allPassed = results.every(result => 
    result.status === 'fulfilled' && result.value === true
  )
  
  console.log('\n📊 Test Results:')
  results.forEach((result, index) => {
    const testNames = ['Database Connection', 'Password Utilities', 'JWT Utilities']
    if (result.status === 'fulfilled') {
      console.log(`${result.value ? '✅' : '❌'} ${testNames[index]}`)
    } else {
      console.log(`❌ ${testNames[index]} - ${result.reason}`)
    }
  })
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Core infrastructure is ready.')
  } else {
    console.log('\n⚠️  Some tests failed. Please check the configuration.')
  }
  
  // Close database connection
  await mongoose.connection.close()
}