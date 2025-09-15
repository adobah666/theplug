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

  // Check if mongoose is already connected (handles race conditions)
  if (mongoose.connection.readyState === 1) {
    connection.isConnected = 1
    console.log('MongoDB already connected via mongoose')
    return
  }

  try {
    // Attempt to connect to the database with enhanced options for production reliability
    const isProd = process.env.NODE_ENV === 'production'
    mongoose.set('strictQuery', true)
    
    const db = await mongoose.connect(process.env.MONGODB_URI || '', {
      dbName: process.env.MONGODB_DB_NAME || 'fashion-ecommerce',
      autoIndex: !isProd,
      // Enhanced connection options for production reliability
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      retryWrites: true, // Enable retryable writes
      retryReads: true, // Enable retryable reads
    })

    connection.isConnected = db.connections[0].readyState

    console.log('MongoDB connected successfully')
  } catch (error) {
    console.error('Database connection failed:', error)
    
    // In production, don't exit the process - let the request fail gracefully
    if (process.env.NODE_ENV === 'production') {
      connection.isConnected = 0
      throw new Error('Database connection failed')
    } else {
      // Exit process with failure in development
      process.exit(1)
    }
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