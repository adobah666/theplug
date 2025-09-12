import mongoose from 'mongoose'

type ConnectionObject = {
  isConnected?: number
}

const connection: ConnectionObject = {}

async function connectDB(): Promise<void> {
  // Check if we have a connection to the database or if it's currently connecting
  if (connection.isConnected) {
    console.log('Already connected to MongoDB')
    return
  }

  try {
    // Attempt to connect to the database
    // Favor fewer warnings in prod by disabling autoIndex (indexes should be created via migrations)
    const isProd = process.env.NODE_ENV === 'production'
    mongoose.set('strictQuery', true)
    const db = await mongoose.connect(process.env.MONGODB_URI || '', {
      dbName: process.env.MONGODB_DB_NAME || 'fashion-ecommerce',
      autoIndex: !isProd,
    })

    connection.isConnected = db.connections[0].readyState

    console.log('MongoDB connected successfully')
  } catch (error) {
    console.error('Database connection failed:', error)
    // Exit process with failure
    process.exit(1)
  }
}

async function disconnectDB(): Promise<void> {
  if (connection.isConnected) {
    await mongoose.disconnect()
    connection.isConnected = 0
    console.log('MongoDB disconnected')
  }
}

export default connectDB
export { disconnectDB }