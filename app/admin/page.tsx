import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import ProductCreateForm from '@/components/admin/ProductCreateForm'
import ProductTable from '@/components/admin/ProductTable'

export const metadata = {
  title: 'Admin Dashboard',
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>
      <div className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-medium mb-4">Manage Products</h2>
            <ProductTable />
          </div>
          <div>
            <h2 className="text-xl font-medium mb-4">Add New Product</h2>
            <ProductCreateForm />
          </div>
        </div>
      </div>
    </div>
  )
}
