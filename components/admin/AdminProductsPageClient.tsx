"use client"

import React, { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import ProductTable from '@/components/admin/ProductTable'
import ProductCreateForm from '@/components/admin/ProductCreateForm'

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function AdminProductsPageClient() {
  const [open, setOpen] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [recalcLoading, setRecalcLoading] = useState(false)
  const [migrateLoading, setMigrateLoading] = useState(false)

  useEffect(() => {
    const handler = () => setOpen(false)
    if (typeof window !== 'undefined') {
      window.addEventListener('admin:product:created', handler as any)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('admin:product:created', handler as any)
      }
    }
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Manage Products</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                setMigrateLoading(true)
                const res = await fetch('/api/admin/analytics/migrate', { method: 'POST' })
                const json = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(json?.error || 'Migration failed')
                alert(`Migration completed: ${json?.data?.modified || 0} products updated`)
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new Event('admin:analytics:updated'))
                }
              } catch (e) {
                alert(e instanceof Error ? e.message : 'Failed to migrate analytics')
              } finally {
                setMigrateLoading(false)
              }
            }}
            disabled={migrateLoading}
            className="inline-flex items-center gap-2 rounded-md bg-yellow-100 px-3 py-2 text-yellow-800 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Migrate Analytics"
            title="Migrate Analytics"
          >
            {migrateLoading ? 'Migrating…' : 'Migrate Analytics'}
          </button>
          <button
            onClick={async () => {
              try {
                setSyncLoading(true)
                const res = await fetch('/api/admin/analytics/backfill', { method: 'POST' })
                const json = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(json?.error || 'Backfill failed')
                alert('Analytics backfill completed')
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new Event('admin:analytics:updated'))
                }
              } catch (e) {
                alert(e instanceof Error ? e.message : 'Failed to backfill analytics')
              } finally {
                setSyncLoading(false)
              }
            }}
            disabled={syncLoading}
            className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Sync Analytics"
            title="Sync Analytics"
          >
            {syncLoading ? 'Syncing…' : 'Sync Analytics'}
          </button>
          <button
            onClick={async () => {
              try {
                setRecalcLoading(true)
                const res = await fetch('/api/admin/analytics/recalc', { method: 'POST' })
                const json = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(json?.error || 'Recalc failed')
                alert('Popularity recalculated')
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new Event('admin:analytics:updated'))
                }
              } catch (e) {
                alert(e instanceof Error ? e.message : 'Failed to recalc popularity')
              } finally {
                setRecalcLoading(false)
              }
            }}
            disabled={recalcLoading}
            className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Recalc Popularity"
            title="Recalc Popularity"
          >
            {recalcLoading ? 'Recalculating…' : 'Recalc Popularity'}
          </button>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Add New Product"
            title="Add New Product"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Add Product</span>
          </button>
        </div>
      </div>

      <ProductTable />

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium">Add New Product</h2>
          <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-900">✕</button>
        </div>
        <ProductCreateForm />
      </Modal>
    </div>
  )
}
