import { ConnectOptions } from 'mongoose'

export const dbConfig: ConnectOptions = {
  // Connection will be handled by the connection string
  // Additional options can be added here as needed
}

export const DB_NAME = process.env.MONGODB_DB_NAME || 'fashion-ecommerce'
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ecommerce'

// Validate required environment variables
if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

if (!process.env.JWT_SECRET) {
  throw new Error('Please define the JWT_SECRET environment variable inside .env.local')
}