import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import ProductCreateForm from '@/components/admin/ProductCreateForm'

export const metadata = {
  title: 'Admin Dashboard - Add Product',
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!session) {
    redirect('/login')
  }

  if (role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Add New Product</h1>
      <ProductCreateForm />
    </div>
  )
}
