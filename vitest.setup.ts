import { config } from 'dotenv'
import '@testing-library/jest-dom'

// Load environment variables from .env.local for testing
config({ path: '.env.local' })

// Set test environment variables
process.env.MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/fashion-ecommerce-test'