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
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Manage Products</h1>
            <p className="text-sm text-gray-600 mt-1">Add new products and manage your catalog. Use filters below to find items quickly.</p>
          </div>
          <div className="flex items-center gap-2">
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
