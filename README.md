# Fashion Ecommerce Platform

A modern fashion ecommerce platform built with Next.js 15, React 19, and Tailwind CSS. This platform provides a comprehensive online shopping experience for clothing, shoes, and fashion accessories.

## Features

- 🛍️ Product catalog with search and filtering
- 👤 User authentication and account management
- 🛒 Shopping cart and checkout process
- 💳 Payment processing with Paystack
- 📦 Order management and tracking
- ⭐ Product reviews and ratings
- 📱 Mobile-responsive design
- 🔍 Advanced search with Meilisearch

## Quick Start

1. **Setup the project:**
   ```bash
   npm install
   cp .env.example .env.local
   ```

2. **Configure environment variables in `.env.local`**

3. **Test the setup:**
   ```bash
   npm run test:core
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

For detailed setup instructions, see [docs/SETUP.md](docs/SETUP.md).

## Technology Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS 4
- **Backend:** Next.js API Routes, MongoDB, Mongoose
- **Authentication:** NextAuth.js, JWT, bcryptjs
- **Payment:** Paystack
- **Search:** Meilisearch
- **Email:** AWS SES
- **Images:** Cloudinary

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
