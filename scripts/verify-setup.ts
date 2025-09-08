#!/usr/bin/env tsx

// Load environment variables first
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import fs from 'fs'
import path from 'path'

function checkFile(filePath: string): boolean {
  return fs.existsSync(filePath)
}

function checkEnvVar(varName: string): boolean {
  return !!process.env[varName]
}

async function verifySetup() {
  console.log('🔍 Verifying Fashion Ecommerce Platform Setup...\n')

  // Check required files
  const requiredFiles = [
    '.env.local',
    'lib/db/connection.ts',
    'lib/db/config.ts',
    'lib/auth/jwt.ts',
    'lib/auth/password.ts',
    'types/index.ts',
    'docs/SETUP.md'
  ]

  console.log('📁 Checking required files:')
  let filesOk = true
  for (const file of requiredFiles) {
    const exists = checkFile(file)
    console.log(`${exists ? '✅' : '❌'} ${file}`)
    if (!exists) filesOk = false
  }

  // Check environment variables
  const requiredEnvVars = [
    'MONGODB_URI',
    'MONGODB_DB_NAME',
    'JWT_SECRET',
    'NEXTAUTH_SECRET'
  ]

  console.log('\n🔧 Checking environment variables:')
  let envOk = true
  for (const envVar of requiredEnvVars) {
    const exists = checkEnvVar(envVar)
    console.log(`${exists ? '✅' : '❌'} ${envVar}`)
    if (!exists) envOk = false
  }

  // Check dependencies
  console.log('\n📦 Checking key dependencies:')
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const requiredDeps = ['mongoose', 'bcryptjs', 'jsonwebtoken', 'next', 'react']
  
  let depsOk = true
  for (const dep of requiredDeps) {
    const exists = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]
    console.log(`${exists ? '✅' : '❌'} ${dep}`)
    if (!exists) depsOk = false
  }

  // Overall status
  console.log('\n📊 Setup Status:')
  console.log(`${filesOk ? '✅' : '❌'} Required Files`)
  console.log(`${envOk ? '✅' : '❌'} Environment Variables`)
  console.log(`${depsOk ? '✅' : '❌'} Dependencies`)

  const allOk = filesOk && envOk && depsOk

  if (allOk) {
    console.log('\n🎉 Setup verification passed!')
    console.log('💡 Next steps:')
    console.log('   1. Run: npm run test:core')
    console.log('   2. Set up MongoDB (see docs/SETUP.md)')
    console.log('   3. Run: npm run test:infrastructure')
    console.log('   4. Start development: npm run dev')
  } else {
    console.log('\n⚠️  Setup verification failed!')
    console.log('📖 Please check docs/SETUP.md for detailed instructions')
  }

  return allOk
}

async function main() {
  try {
    const success = await verifySetup()
    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('Verification failed:', error)
    process.exit(1)
  }
}

main()