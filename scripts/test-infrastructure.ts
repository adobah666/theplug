#!/usr/bin/env tsx

// Load environment variables first
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { runAllTests } from '../lib/db/test-connection'

async function main() {
  try {
    await runAllTests()
  } catch (error) {
    console.error('Test execution failed:', error)
    process.exit(1)
  }
}

main()