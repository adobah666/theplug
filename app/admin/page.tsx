import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import AdminProductsPageClient from '@/components/admin/AdminProductsPageClient'

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
    <AdminProductsPageClient />
  )
}
