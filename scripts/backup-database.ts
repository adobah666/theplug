import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const PRODUCTION_DB_NAME = 'fashion-ecommerce-prod'

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const backupDir = path.join(process.cwd(), 'backups', `backup-${timestamp}`)

  try {
    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    console.log('🔄 Connecting to production database...')
    
    // Get MongoDB URI from environment
    const mongoUri = process.env.MONGODB_URI
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables')
    }

    // Connect to MongoDB
    await mongoose.connect(mongoUri, {
      dbName: PRODUCTION_DB_NAME
    })

    console.log('✅ Connected to database:', PRODUCTION_DB_NAME)

    // Get all collections
    const db = mongoose.connection.db
    if (!db) {
      throw new Error('Database connection not established')
    }

    const collections = await db.listCollections().toArray()
    console.log(`📦 Found ${collections.length} collections to backup`)

    let totalDocuments = 0

    // Backup each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name
      console.log(`\n📥 Backing up collection: ${collectionName}`)

      const collection = db.collection(collectionName)
      const documents = await collection.find({}).toArray()
      
      const filePath = path.join(backupDir, `${collectionName}.json`)
      fs.writeFileSync(filePath, JSON.stringify(documents, null, 2))
      
      console.log(`   ✓ Saved ${documents.length} documents to ${collectionName}.json`)
      totalDocuments += documents.length
    }

    // Create metadata file
    const metadata = {
      backupDate: new Date().toISOString(),
      databaseName: PRODUCTION_DB_NAME,
      collections: collections.map(c => c.name),
      totalDocuments,
      mongoUri: mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') // Hide credentials
    }

    fs.writeFileSync(
      path.join(backupDir, '_metadata.json'),
      JSON.stringify(metadata, null, 2)
    )

    console.log('\n' + '='.repeat(60))
    console.log('✅ Backup completed successfully!')
    console.log('='.repeat(60))
    console.log(`📁 Backup location: ${backupDir}`)
    console.log(`📊 Total collections: ${collections.length}`)
    console.log(`📄 Total documents: ${totalDocuments}`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Backup failed:', error)
    throw error
  } finally {
    await mongoose.disconnect()
    console.log('\n🔌 Disconnected from database')
  }
}

// Run backup
backupDatabase()
  .then(() => {
    console.log('\n✨ Backup process completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Backup process failed:', error)
    process.exit(1)
  })
