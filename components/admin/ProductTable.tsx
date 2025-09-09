'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { formatCurrency } from '@/lib/utils/currency'

interface ProductRow {
  _id: string
  name: string
  price: number
  brand: string
  inventory: number
  images: string[]
  category?: { _id: string; name: string }
}

export default function ProductTable() {
  const [items, setItems] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(12)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [pendingSearch, setPendingSearch] = useState('')

  // Filters
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [brandsFilter, setBrandsFilter] = useState<string>('')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const qs = new URLSearchParams()
      qs.set('page', String(page))
      qs.set('limit', String(limit))

      let url = ''
      if (search.trim().length > 0) {
        qs.set('q', search.trim())
        // Use search endpoint
        url = `/api/products/search?${qs.toString()}`
      } else {
        url = `/api/products?${qs.toString()}`
      }

      // Apply filters (search endpoint supports these; list endpoint ignores unknown params)
      if (categoryFilter) qs.set('category', categoryFilter)
      if (brandsFilter) qs.set('brand', brandsFilter)
      // Normalize numeric filters
      const mn = minPrice.trim() === '' ? undefined : Number(minPrice)
      const mx = maxPrice.trim() === '' ? undefined : Number(maxPrice)
      let useMin = (mn !== undefined && !Number.isNaN(mn)) ? mn : undefined
      let useMax = (mx !== undefined && !Number.isNaN(mx)) ? mx : undefined
      if (useMin !== undefined && useMax !== undefined && useMin > useMax) {
        // swap to be forgiving
        const tmp = useMin; useMin = useMax; useMax = tmp
      }
      if (useMin !== undefined) qs.set('minPrice', String(useMin))
      if (useMax !== undefined) qs.set('maxPrice', String(useMax))
      // Always hit search endpoint when any filter is applied
      if (categoryFilter || brandsFilter || minPrice || maxPrice || search.trim().length > 0) {
        url = `/api/products/search?${qs.toString()}`
      }

      const res = await fetch(url, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to load products')

      // Normalize response shape
      let data: any[] = []
      let pagination: { total: number } = { total: 0 }
      if (json?.data?.data && json?.data?.pagination) {
        data = json.data.data
        pagination = json.data.pagination
      } else if (Array.isArray(json?.data)) {
        data = json.data
      } else if (json?.data?.products) {
        data = json.data.products
      }

      const rows: ProductRow[] = (data || []).map((p: any) => ({
        _id: p._id,
        name: p.name,
        price: p.price,
        brand: p.brand,
        inventory: p.inventory ?? 0,
        images: p.images || [],
        category: p.category && typeof p.category === 'object' ? { _id: p.category._id, name: p.category.name } : undefined,
      }))
      setItems(rows)
      setTotal(pagination?.total ?? rows.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, categoryFilter, brandsFilter, minPrice, maxPrice])

  // Load categories for filter dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/categories', { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        const list = (json?.data?.categories || []) as Array<{ _id: string; name: string }>
        list.sort((a, b) => a.name.localeCompare(b.name))
        setCategories(list)
      } catch {
        setCategories([])
      }
    })()
  }, [])

  // Listen for product creation events to auto-refresh the list
  useEffect(() => {
    const onCreated = (e: Event) => {
      // If the new item belongs on current page+filter, easiest is to reload
      load()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('admin:product:created', onCreated)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('admin:product:created', onCreated)
      }
    }
  }, [page, search])

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(pendingSearch)
  }

  const onClearFilters = () => {
    setCategoryFilter('')
    setBrandsFilter('')
    setMinPrice('')
    setMaxPrice('')
    setPendingSearch('')
    setSearch('')
    setPage(1)
  }

  const onDelete = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to delete product')
      setItems(prev => prev.filter(p => p._id !== id))
      setTotal(t => Math.max(0, t - 1))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete product')
    }
  }

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<ProductRow>>({})
  const [showModal, setShowModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [brands, setBrands] = useState<Array<{ name: string }>>([])
  const [modalData, setModalData] = useState<any | null>(null)

  // Full-edit modal helpers (must be inside component scope)
  const openModal = async (id: string) => {
    try {
      setShowModal(true)
      setModalLoading(true)
      setModalError(null)
      const [resP, resB] = await Promise.all([
        fetch(`/api/products/${id}`, { cache: 'no-store' }),
        fetch('/api/brands', { cache: 'no-store' })
      ])
      const jsonP = await resP.json().catch(() => ({}))
      const jsonB = await resB.json().catch(() => ({}))
      if (!resP.ok) throw new Error(jsonP?.error || 'Failed to load product')
      if (!resB.ok) throw new Error(jsonB?.error || 'Failed to load brands')
      const product = jsonP?.data?.product || jsonP?.product || jsonP
      const brandList = (jsonB?.brands || []) as Array<{ name: string }>
      brandList.sort((a, b) => a.name.localeCompare(b.name))
      setBrands(brandList)
      const normalized = {
        _id: product._id,
        name: product.name,
        price: product.price,
        brand: product.brand || '',
        inventory: product.inventory ?? 0,
        variants: (product.variants || []).map((v: any) => ({
          _id: v._id,
          size: v.size,
          sizeSystem: typeof v.size === 'string' && v.size.startsWith('EU ') ? 'shoe' : (v.size ? 'apparel' : undefined),
          color: v.color,
          sku: v.sku,
          price: v.price,
          inventory: v.inventory ?? 0,
        }))
      }
      setModalData(normalized)
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to open editor')
    } finally {
      setModalLoading(false)
    }
  }

  // Auto-total inventory and auto-generate SKUs when relevant fields change
  useEffect(() => {
    if (!modalData) return
    const variantsArr = modalData.variants || []
    if (variantsArr.length > 0) {
      const total = variantsArr.reduce((s: number, v: any) => s + (Number(v.inventory) || 0), 0)
      // Update total only if changed to avoid loops
      if (modalData.inventory !== total) {
        setModalData((d: any) => ({ ...d, inventory: total }))
      }
      const drafts = variantsArr.map((v: any) => generateBaseSku(modalData.brand, modalData.name, v.color, v.size))
      const uniques = makeUniqueSkus(drafts)
      setModalData((d: any) => ({ ...d, variants: d.variants.map((v: any, i: number) => ({ ...v, sku: uniques[i] })) }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalData?.brand, modalData?.name, JSON.stringify(modalData?.variants?.map((v: any) => ({ c: v.color, s: v.size, inv: v.inventory, sys: v.sizeSystem })))])

  const addVariantRow = () => {
    setModalData((d: any) => ({ ...d, variants: [...d.variants, { size: undefined, sizeSystem: undefined, color: '', sku: '', price: undefined, inventory: 0 }] }))
  }
  const removeVariantRow = (idx: number) => {
    setModalData((d: any) => ({ ...d, variants: d.variants.filter((_: any, i: number) => i !== idx) }))
  }
  const updateVariantRow = (idx: number, patch: any) => {
    setModalData((d: any) => ({ ...d, variants: d.variants.map((v: any, i: number) => (i === idx ? { ...v, ...patch } : v)) }))
  }
  const onVariantShoeSize = (idx: number, val: string) => {
    if (!val) return updateVariantRow(idx, { size: undefined, sizeSystem: undefined })
    updateVariantRow(idx, { size: `EU ${val}`, sizeSystem: 'shoe' })
  }
  const onVariantApparelSize = (idx: number, val: string) => {
    if (!val) return updateVariantRow(idx, { size: undefined, sizeSystem: undefined })
    updateVariantRow(idx, { size: val, sizeSystem: 'apparel' })
  }
  const resetVariantSize = (idx: number) => updateVariantRow(idx, { size: undefined, sizeSystem: undefined })
  const onVariantPresetColor = (idx: number, val: string) => {
    if (!val) return
    updateVariantRow(idx, { color: val })
  }
  const onVariantInventory = (idx: number, inv: number) => updateVariantRow(idx, { inventory: inv })

  const saveModal = async () => {
    try {
      setModalLoading(true)
      setModalError(null)
      const body: any = {
        name: modalData.name,
        price: Number(modalData.price),
        brand: modalData.brand,
        inventory: Number(modalData.inventory),
        variants: modalData.variants.map((v: any) => ({ _id: v._id, size: v.size, color: v.color, sku: v.sku, price: v.price, inventory: Number(v.inventory) }))
      }
      const res = await fetch(`/api/products/${modalData._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to save changes')
      setItems(prev => prev.map(p => p._id === modalData._id ? { ...p, name: body.name, price: body.price, brand: body.brand, inventory: body.inventory } : p))
      setShowModal(false)
      setModalData(null)
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setModalLoading(false)
    }
  }
  // Utilities copied from create form for sizes/colors and SKUs
  const EU_SHOE_SIZES = Array.from({ length: 15 }, (_, i) => String(35 + i)) // 35 - 49
  const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
  const COMMON_COLORS = ['Black','White','Red','Blue','Green','Yellow','Gray','Brown','Pink','Purple','Orange','Beige']
  const toCode = (s: string, len: number) => (s || '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, len)
  const compactSize = (s?: string) => (s || '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 4) || 'OS'
  const compactColor = (s?: string) => (s || '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 3) || 'CLR'
  const generateBaseSku = (b: string, n: string, color?: string, size?: string) => {
    const brandCode = toCode(b, 2) || 'BR'
    const nameCode = toCode(n, 3) || 'PRD'
    const colorCode = compactColor(color)
    const sizeCode = compactSize(size)
    let base = `${brandCode}${nameCode}-${colorCode}-${sizeCode}`
    if (base.length > 20) {
      const b2 = toCode(b, 2); const n2 = toCode(n, 2); const c2 = compactColor(color).slice(0,2) || 'C'; const s2 = compactSize(size).slice(0,3) || 'OS'
      base = `${b2}${n2}-${c2}-${s2}`
      if (base.length > 20) {
        const n1 = toCode(n, 1); const s1 = compactSize(size).slice(0,2) || 'OS'
        base = `${b2}${n1}-${c2}-${s1}`
        if (base.length > 20) base = base.slice(0,20)
      }
    }
    return base
  }
  const makeUniqueSkus = (drafts: string[]) => {
    const seen = new Map<string, number>()
    return drafts.map((sku) => {
      let candidate = sku
      if (!seen.has(candidate)) { seen.set(candidate, 1); return candidate }
      let idx = seen.get(candidate)! + 1
      let next = `${candidate}-${idx}`
      if (next.length > 20) {
        const base = candidate.slice(0, Math.max(0, 20 - (`-${idx}`).length))
        next = `${base}-${idx}`
      }
      while (seen.has(next)) { idx++; next = `${candidate.slice(0, Math.max(0, 20 - (`-${idx}`).length))}-${idx}` }
      seen.set(candidate, idx); seen.set(next, 1); return next
    })
  }

  const startEdit = (p: ProductRow) => {
    setEditingId(p._id)
    setEditDraft({ name: p.name, price: p.price, brand: p.brand, inventory: p.inventory })
  }

  const saveEdit = async () => {
    if (!editingId) return
    try {
      const body: any = {
        ...('name' in editDraft ? { name: editDraft.name } : {}),
        ...('price' in editDraft ? { price: Number(editDraft.price) } : {}),
        ...('brand' in editDraft ? { brand: editDraft.brand } : {}),
        ...('inventory' in editDraft ? { inventory: Number(editDraft.inventory) } : {}),
      }
      const res = await fetch(`/api/products/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to update product')
      setItems(prev => prev.map(p => (p._id === editingId ? { ...p, ...body } as ProductRow : p)))
      setEditingId(null)
      setEditDraft({})
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update product')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <form onSubmit={onSearchSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-600 mb-1">Search</label>
          <Input placeholder="Search products..." value={pendingSearch} onChange={e => setPendingSearch(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Category</label>
          <select className="w-full border rounded-md p-2 bg-white" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}>
            <option value="">All</option>
            {categories.map(c => (<option key={c._id} value={c._id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Brand</label>
          <Input placeholder="e.g. Nike" value={brandsFilter} onChange={e => { setBrandsFilter(e.target.value); setPage(1) }} />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Min Price</label>
          <Input type="number" min="0" value={minPrice} onChange={e => { setMinPrice(e.target.value); setPage(1) }} />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Max Price</label>
          <Input type="number" min="0" value={maxPrice} onChange={e => { setMaxPrice(e.target.value); setPage(1) }} />
        </div>
        <div className="flex gap-2 md:col-span-6">
          <Button type="submit">Apply</Button>
          <Button type="button" variant="ghost" onClick={onClearFilters}>Clear</Button>
        </div>
      </form>

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-left">Brand</th>
                <th className="px-3 py-2 text-left">Price</th>
                <th className="px-3 py-2 text-left">Inventory</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p._id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {p.images?.[0] && <img src={p.images[0]} alt="" className="w-10 h-10 object-cover rounded" />}
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-gray-500 text-xs">{p.category?.name || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">{p.brand}</td>
                  <td className="px-3 py-2">{formatCurrency(p.price)}</td>
                  <td className="px-3 py-2">{p.inventory}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={async () => { await openModal(p._id) }}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => onDelete(p._id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
        </div>
      </div>

      {/* Full Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)}>
        {modalLoading ? (
          <div className="py-10 flex justify-center"><LoadingSpinner size="lg" /></div>
        ) : modalError ? (
          <ErrorMessage message={modalError} />
        ) : modalData ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Edit Product</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-700">Name</label>
                <Input value={modalData.name} onChange={e => setModalData((d: any) => ({ ...d, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-700">Price</label>
                <Input type="number" value={modalData.price} onChange={e => setModalData((d: any) => ({ ...d, price: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-sm text-gray-700">Brand</label>
                <select className="w-full border rounded-md p-2 bg-white" value={modalData.brand}
                  onChange={e => setModalData((d: any) => ({ ...d, brand: e.target.value }))}
                >
                  {brands.length === 0 && <option value="">No brands</option>}
                  {brands.map(b => (<option key={b.name} value={b.name}>{b.name}</option>))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-700">Inventory {modalData.variants?.length > 0 ? '(auto from variants)' : ''}</label>
                <Input
                  disabled={modalData.variants?.length > 0}
                  type="number"
                  value={modalData.inventory}
                  onChange={e => setModalData((d: any) => ({ ...d, inventory: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Variants</h4>
                <Button size="sm" variant="secondary" onClick={() => addVariantRow()}>Add Variant</Button>
              </div>
              {modalData.variants.length === 0 && (
                <p className="text-sm text-gray-500">No variants.</p>
              )}
              <div className="space-y-3">
                {modalData.variants.map((v: any, idx: number) => (
                  <div key={idx} className="border rounded-md p-3 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">Shoe Size (EU 35-49)</label>
                        <select className="w-full border rounded-md p-2 bg-white"
                          value={v.sizeSystem === 'shoe' && v.size?.startsWith('EU ') ? v.size.replace('EU ', '') : ''}
                          onChange={(e) => onVariantShoeSize(idx, e.target.value)}
                          disabled={v.sizeSystem === 'apparel'}
                        >
                          <option value="">Select EU size</option>
                          {EU_SHOE_SIZES.map(s => (<option key={s} value={s}>{s}</option>))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">Apparel Size</label>
                        <select className="w-full border rounded-md p-2 bg-white"
                          value={v.sizeSystem === 'apparel' ? (v.size || '') : ''}
                          onChange={(e) => onVariantApparelSize(idx, e.target.value)}
                          disabled={v.sizeSystem === 'shoe'}
                        >
                          <option value="">Select apparel size</option>
                          {APPAREL_SIZES.map(s => (<option key={s} value={s}>{s}</option>))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <Button type="button" variant="secondary" className="w-full" onClick={() => resetVariantSize(idx)}>Reset size</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs text-gray-600">Color</label>
                        <div className="flex gap-2">
                          <select className="w-full border rounded-md p-2 bg-white"
                            value={COMMON_COLORS.includes((v.color || '').trim()) ? (v.color || '') : ''}
                            onChange={(e) => onVariantPresetColor(idx, e.target.value)}
                          >
                            <option value="">Custom...</option>
                            {COMMON_COLORS.map(c => (<option key={c} value={c}>{c}</option>))}
                          </select>
                          <Input placeholder="Custom color" value={COMMON_COLORS.includes((v.color || '').trim()) ? '' : (v.color || '')}
                            onChange={(e) => updateVariantRow(idx, { color: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">SKU</label>
                        <div className="text-sm font-mono bg-gray-50 border rounded-md p-2 select-all">{v.sku || '—'}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">Inventory</label>
                        <Input type="number" value={v.inventory}
                          onChange={(e) => onVariantInventory(idx, Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => removeVariantRow(idx)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={saveModal}>Save Changes</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

async function fetchBrandsList(): Promise<Array<{ name: string }>> {
  try {
    const res = await fetch('/api/brands', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error || 'Failed to load brands')
    const list = (json?.brands || []) as Array<{ name: string }>
    list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  } catch {
    return []
  }
}

// Modal logic (appended to component via function declarations within the module)
function Modal({ open, onClose, children }: { open: boolean, onClose: () => void, children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

