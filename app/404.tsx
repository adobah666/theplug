export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function FourOhFour() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-lg">
        <h1 className="text-4xl font-bold mb-4">404 - Page not found</h1>
        <p className="text-gray-600 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <a href="/" className="text-blue-600 hover:text-blue-500 font-medium">Return home</a>
      </div>
    </div>
  )
}
