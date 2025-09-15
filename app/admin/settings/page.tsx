import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import SettingsPageClient from '@/components/admin/SettingsPageClient'

export const metadata = { title: 'Store Settings' }

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if ((session.user as any)?.role !== 'admin') redirect('/')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="rounded-lg border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm px-4 py-5 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Store Settings</h1>
        <p className="text-sm text-gray-600 mt-1">Configure delivery fees and tax rate. Regional fees override the default.</p>
      </div>
      <SettingsPageClient />
    </div>
  )
}
