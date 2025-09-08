#!/usr/bin/env tsx

// Load environment variables first
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { testPasswordUtilities, testJWTUtilities } from '../lib/db/test-connection'

async function main() {
  console.log('🚀 Testing core utilities (without database)...\n')
  
  try {
    const passwordTest = await testPasswordUtilities()
    const jwtTest = await testJWTUtilities()
    
    console.log('\n📊 Test Results:')
    console.log(`${passwordTest ? '✅' : '❌'} Password Utilities`)
    console.log(`${jwtTest ? '✅' : '❌'} JWT Utilities`)
    
    if (passwordTest && jwtTest) {
      console.log('\n🎉 All core utilities are working correctly!')
      console.log('💡 To test database connection, ensure MongoDB is running and use: npm run test:infrastructure')
    } else {
      console.log('\n⚠️  Some utilities failed. Please check the configuration.')
      process.exit(1)
    }
  } catch (error) {
    console.error('Test execution failed:', error)
    process.exit(1)
  }
}

main()