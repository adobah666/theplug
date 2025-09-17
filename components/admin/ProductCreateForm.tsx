'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface VariantInput {
  size?: string
  // Indicates which sizing system was used for this variant
  sizeSystem?: 'shoe' | 'apparel'
  color?: string
  sku: string
  price?: number
  inventory: number
}

const EU_SHOE_SIZES = Array.from({ length: 15 }, (_, i) => String(35 + i)) // 35 - 49
const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
const COMMON_COLORS = [
  'Black','White','Red','Blue','Green','Yellow','Gray','Brown','Pink','Purple','Orange','Beige'
]

export default function ProductCreateForm() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('') // Mongo ObjectId
  const [brand, setBrand] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'unisex'>('unisex')
  const [inventory, setInventory] = useState<number | ''>('')
  const [variants, setVariants] = useState<VariantInput[]>([])

  // Keep inventory equal to sum of variant inventories when variants exist
  useEffect(() => {
    if (variants.length > 0) {
      const total = variants.reduce((sum, v) => sum + (Number(v.inventory) || 0), 0)
      setInventory(total)
    }
  }, [variants])

  // Categories state
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([])
  const [catLoading, setCatLoading] = useState(false)
  const [catError, setCatError] = useState<string | null>(null)
  const [showCreateCat, setShowCreateCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [creatingCat, setCreatingCat] = useState(false)

  const loadCategories = async () => {
    try {
      setCatLoading(true)
      setCatError(null)
      const res = await fetch('/api/categories', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to load categories')
      const list = (json?.data?.categories || []) as Array<{ _id: string; name: string }>
      // Sort by name ASC
      list.sort((a, b) => a.name.localeCompare(b.name))
      setCategories(list)
      // If none selected and we have list, preselect first
      if (!category && list.length > 0) {
        setCategory(list[0]._id)
      }
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setCatLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Brands state
  const [brands, setBrands] = useState<Array<{ name: string; slug?: string }>>([])
  const [brandsLoading, setBrandsLoading] = useState(false)
  const [brandsError, setBrandsError] = useState<string | null>(null)
  const [showCreateBrand, setShowCreateBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')

  const loadBrands = async () => {
    try {
      setBrandsLoading(true)
      setBrandsError(null)
      const res = await fetch('/api/brands', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to load brands')
      // API shape: { success: true, brands: [{ name, slug, ...}] }
      const list = (json?.brands || []) as Array<{ name: string; slug?: string }>
      list.sort((a, b) => a.name.localeCompare(b.name))
      setBrands(list)
      if (!brand && list.length > 0) {
        setBrand(list[0].name)
      }
    } catch (err) {
      setBrandsError(err instanceof Error ? err.message : 'Failed to load brands')
    } finally {
      setBrandsLoading(false)
    }
  }

  useEffect(() => {
    loadBrands()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const addVariant = () => setVariants(v => [...v, { sku: '', inventory: 0 }])
  const updateVariant = (index: number, patch: Partial<VariantInput>) => {
    setVariants(v => v.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }
  const removeVariant = (index: number) => {
    setVariants(v => v.filter((_, i) => i !== index))
  }

  // Utilities for SKU generation
  const toCode = (s: string, len: number) => (s || '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, len)
  const compactSize = (s?: string) => (s || '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 4) || 'OS'
  const compactColor = (s?: string) => (s || '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 3) || 'CLR'
  const generateBaseSku = (b: string, n: string, color?: string, size?: string) => {
    const brandCode = toCode(b, 2) || 'BR'
    const nameCode = toCode(n, 3) || 'PRD'
    const colorCode = compactColor(color)
    const sizeCode = compactSize(size)
    let base = `${brandCode}${nameCode}-${colorCode}-${sizeCode}` // e.g., NINIK-RED-EU42
    if (base.length > 20) {
      // progressively shrink to fit 20 chars
      const b2 = toCode(b, 2)
      const n2 = toCode(n, 2)
      const c2 = compactColor(color).slice(0, 2) || 'C'
      const s2 = compactSize(size).slice(0, 3) || 'OS'
      base = `${b2}${n2}-${c2}-${s2}`
      if (base.length > 20) {
        const n1 = toCode(n, 1)
        const s1 = compactSize(size).slice(0, 2) || 'OS'
        base = `${b2}${n1}-${c2}-${s1}`
        if (base.length > 20) {
          base = base.slice(0, 20)
        }
      }
    }
    return base
  }
  const makeUniqueSkus = (drafts: string[]) => {
    const seen = new Map<string, number>()
    return drafts.map((sku) => {
      let candidate = sku
      if (!seen.has(candidate)) {
        seen.set(candidate, 1)
        return candidate
      }
      let idx = seen.get(candidate)! + 1
      let next = `${candidate}-${idx}`
      // Trim to 20 if needed when adding suffix
      if (next.length > 20) {
        const base = candidate.slice(0, Math.max(0, 20 - (`-${idx}`).length))
        next = `${base}-${idx}`
      }
      while (seen.has(next)) {
        idx++
        next = `${candidate.slice(0, Math.max(0, 20 - (`-${idx}`).length))}-${idx}`
      }
      seen.set(candidate, idx)
      seen.set(next, 1)
      return next
    })
  }

  // Recompute SKUs when brand/name/variants change
  useEffect(() => {
    setVariants(prev => {
      if (prev.length === 0) return prev
      const drafts = prev.map(v => generateBaseSku(brand, name, v.color, v.size))
      const uniques = makeUniqueSkus(drafts)
      return prev.map((v, i) => ({ ...v, sku: uniques[i] }))
    })
  }, [brand, name, variants.map(v => `${v.color}|${v.size}|${v.sizeSystem}|${v.inventory}`).join(',')])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        price: typeof price === 'string' ? Number(price) : price,
        images,
        category: category.trim(),
        brand: brand.trim(),
        gender,
        variants: variants.map(v => ({
          size: v.size?.trim() || undefined,
          color: v.color?.trim() || undefined,
          sku: v.sku.trim(),
          price: v.price !== undefined && v.price !== null && v.price !== ('' as unknown as number) ? Number(v.price) : undefined,
          inventory: Number(v.inventory)
        })),
        inventory: typeof inventory === 'string' ? Number(inventory) : (inventory || 0)
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Prefer detailed server validation errors when available
        const detailed = (json?.data && (json.data.errors || json.data.message)) || json?.error || json?.message
        const message = Array.isArray(detailed) ? detailed.join('\n') : (detailed || 'Failed to create product')
        throw new Error(message)
      }

      setSuccess('Product created successfully')
      // Notify product table to refresh
      try {
        const created = json?.data?.product || json?.product || null
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('admin:product:created', { detail: created }))
        }
      } catch {}

      // Reset form fields but keep category/brand to avoid invalid required state
      setName('')
      setDescription('')
      setPrice('')
      setImages([])
      // Keep selected category if any, otherwise default to first available
      setCategory(prev => (prev && prev.length > 0 ? prev : (categories[0]?._id || '')))
      // Keep selected brand if any, otherwise default to first available
      setBrand(prev => (prev && prev.length > 0 ? prev : (brands[0]?.name || '')))
      setGender('unisex')
      setInventory('')
      setVariants([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && <ErrorMessage message={error} />}
      {success && (
        <p className="text-green-600 text-sm">{success}</p>
      )}

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Product name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full border rounded-md p-2 min-h-[100px]"
            placeholder="Product description"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
            <Input type="number" step="0.01" value={price as any} onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))} placeholder="19.99" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Inventory</label>
            <Input
              type="number"
              value={inventory as any}
              onChange={e => setInventory(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="100"
              disabled={variants.length > 0}
            />
            {variants.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">Auto-calculated from variants: {inventory}</p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={async (e) => {
              // Store input before awaiting to avoid React event nullification
              const inputEl = e.currentTarget
              const files = inputEl.files
              if (!files || files.length === 0) return
              setUploading(true)
              setError(null)
              try {
                // Import compression utility dynamically
                const { compressImages, getCompressionStats } = await import('@/lib/utils/image-compression')
                
                // Compress images before upload
                const fileArray = Array.from(files)
                const compressedFiles = await compressImages(fileArray, {
                  maxWidth: 1920,
                  maxHeight: 1920,
                  quality: 0.85,
                  format: 'jpeg',
                  maxSizeKB: 400
                })

                // Log compression stats for debugging
                compressedFiles.forEach((compressed, i) => {
                  const stats = getCompressionStats(fileArray[i], compressed)
                  console.log(`Compressed ${fileArray[i].name}: ${stats.ratio} (${stats.savings}% savings)`)
                })

                const form = new FormData()
                for (const file of compressedFiles) {
                  form.append('files', file)
                }
                const res = await fetch('/api/uploads', { method: 'POST', body: form })
                const json = await res.json()
                if (!res.ok || !json?.urls) {
                  throw new Error(json?.error || 'Upload failed')
                }
                setImages(prev => [...prev, ...json.urls])
                // Clear the file input value
                inputEl.value = ''
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Upload failed')
              } finally {
                setUploading(false)
              }
            }}
            className="block w-full border rounded-md p-2"
          />
          {uploading && (
            <p className="text-sm text-gray-600 mt-1">Uploading...</p>
          )}
          {images.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-gray-700 mb-2">Uploaded Images:</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {images.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img src={url} alt={`uploaded ${idx + 1}`} className="w-full h-20 object-cover rounded border" />
                    <button
                      type="button"
                      aria-label="Remove image"
                      title="Remove"
                      className="absolute top-1 right-1 bg-white/90 hover:bg-white text-red-600 rounded-full px-2 py-0.5 text-xs shadow hidden group-hover:block"
                      onClick={() => setImages(imgs => imgs.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  className="text-sm text-gray-600 hover:underline"
                  onClick={() => setImages([])}
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <div className="flex items-center gap-2">
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border rounded-md p-2 bg-white"
              >
                {catLoading && <option>Loading...</option>}
                {!catLoading && categories.length === 0 && <option value="">No categories</option>}
                {!catLoading && categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              <Button type="button" variant="secondary" onClick={() => setShowCreateCat(v => !v)}>
                {showCreateCat ? 'Close' : '＋'}
              </Button>
            </div>
            {catError && <p className="text-sm text-red-600 mt-1">{catError}</p>}
            {showCreateCat && (
              <div className="mt-3 border rounded-md p-3 space-y-2 bg-white">
                <p className="text-sm font-medium">Create Category</p>
                <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category name" />
                <textarea
                  value={newCatDesc}
                  onChange={e => setNewCatDesc(e.target.value)}
                  className="w-full border rounded-md p-2 min-h-[70px]"
                  placeholder="Description (optional)"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={creatingCat || newCatName.trim().length < 2}
                    onClick={async () => {
                      try {
                        setCreatingCat(true)
                        setCatError(null)
                        const res = await fetch('/api/categories', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: newCatName.trim(), description: newCatDesc.trim() || undefined }),
                        })
                        const json = await res.json().catch(() => ({}))
                        if (!res.ok) throw new Error(json?.error || 'Failed to create category')
                        const created = json?.data?.category
                        if (created) {
                          setCategories(prev => [...prev, { _id: created._id, name: created.name }])
                          setCategory(created._id)
                          setShowCreateCat(false)
                          setNewCatName('')
                          setNewCatDesc('')
                        } else {
                          await loadCategories()
                        }
                      } catch (err) {
                        setCatError(err instanceof Error ? err.message : 'Failed to create category')
                      } finally {
                        setCreatingCat(false)
                      }
                    }}
                  >
                    {creatingCat ? 'Creating...' : 'Create'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowCreateCat(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <div className="flex items-center gap-2">
              <select
                value={brand}
                onChange={e => setBrand(e.target.value)}
                className="w-full border rounded-md p-2 bg-white"
              >
                {brandsLoading && <option>Loading...</option>}
                {!brandsLoading && brands.length === 0 && <option value="">No brands</option>}
                {!brandsLoading && brands.map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
              <Button type="button" variant="secondary" onClick={() => setShowCreateBrand(v => !v)}>
                {showCreateBrand ? 'Close' : '＋'}
              </Button>
            </div>
            {brandsError && <p className="text-sm text-red-600 mt-1">{brandsError}</p>}
            {showCreateBrand && (
              <div className="mt-3 border rounded-md p-3 space-y-2 bg-white">
                <p className="text-sm font-medium">Create Brand</p>
                <Input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="Brand name" />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={newBrandName.trim().length < 1}
                    onClick={() => {
                      const name = newBrandName.trim()
                      if (!name) return
                      // Optimistically add brand locally; it becomes persisted when the product is created
                      setBrands(prev => {
                        if (!prev.find(b => b.name.toLowerCase() === name.toLowerCase())) {
                          const next = [...prev, { name }]
                          next.sort((a, b) => a.name.localeCompare(b.name))
                          return next
                        }
                        return prev
                      })
                      setBrand(name)
                      setShowCreateBrand(false)
                      setNewBrandName('')
                    }}
                  >
                    Add
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowCreateBrand(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Gender</label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value as 'male' | 'female' | 'unisex')}
              className="w-full border rounded-md p-2 bg-white"
            >
              <option value="unisex">Unisex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Variants</h2>
          <Button type="button" variant="secondary" onClick={addVariant}>Add Variant</Button>
        </div>
        {variants.length === 0 && (
          <p className="text-sm text-gray-500">No variants added.</p>
        )}
        <div className="space-y-4">
          {variants.map((v, i) => (
            <div key={i} className="border rounded-md p-4 space-y-3">
              <div className="grid grid-cols-1 gap-3">
                {/* Size selectors */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Shoe Size (EU 35-49)</label>
                    <select
                      className="w-full border rounded-md p-2 bg-white"
                      value={v.sizeSystem === 'shoe' && v.size?.startsWith('EU ')? v.size.replace('EU ','') : ''}
                      onChange={(e) => {
                        const val = e.target.value
                        if (!val) {
                          // reset shoe selection
                          updateVariant(i, { size: undefined, sizeSystem: undefined })
                          return
                        }
                        updateVariant(i, { size: `EU ${val}`, sizeSystem: 'shoe' })
                      }}
                      disabled={v.sizeSystem === 'apparel'}
                    >
                      <option value="">Select EU size</option>
                      {EU_SHOE_SIZES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Apparel Size</label>
                    <select
                      className="w-full border rounded-md p-2 bg-white"
                      value={v.sizeSystem === 'apparel' ? (v.size || '') : ''}
                      onChange={(e) => {
                        const val = e.target.value
                        if (!val) {
                          updateVariant(i, { size: undefined, sizeSystem: undefined })
                          return
                        }
                        updateVariant(i, { size: val, sizeSystem: 'apparel' })
                      }}
                      disabled={v.sizeSystem === 'shoe'}
                    >
                      <option value="">Select apparel size</option>
                      {APPAREL_SIZES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => updateVariant(i, { size: undefined, sizeSystem: undefined })}
                      className="w-full"
                    >
                      Reset size
                    </Button>
                  </div>
                </div>

                {/* Color and generated SKU */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Color</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full border rounded-md p-2 bg-white"
                        value={COMMON_COLORS.includes((v.color || '').trim()) ? (v.color || '') : ''}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '') return // choosing custom or not set
                          updateVariant(i, { color: val })
                        }}
                      >
                        <option value="">Custom...</option>
                        {COMMON_COLORS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <Input
                        placeholder="Custom color"
                        value={COMMON_COLORS.includes((v.color || '').trim()) ? '' : (v.color || '')}
                        onChange={(e) => updateVariant(i, { color: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">SKU</label>
                    <div className="text-sm font-mono bg-gray-50 border rounded-md p-2 select-all">
                      {v.sku || '—'}
                    </div>
                    <p className="text-[11px] text-gray-500">Auto-generated from brand, name, color and size.</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input type="number" step="0.01" placeholder="Price override (optional)" value={(v.price as any) ?? ''} onChange={e => updateVariant(i, { price: e.target.value === '' ? undefined : Number(e.target.value) })} />
                <Input type="number" placeholder="Inventory" value={v.inventory as any} onChange={e => updateVariant(i, { inventory: Number(e.target.value) })} />
              </div>
              <div className="text-right">
                <Button type="button" variant="secondary" onClick={() => removeVariant(i)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? (
          <>
            <LoadingSpinner size="sm" className="mr-2" />
            Creating...
          </>
        ) : (
          'Create Product'
        )}
      </Button>
    </form>
  )
}
