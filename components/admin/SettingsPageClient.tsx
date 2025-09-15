"use client"

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

interface RegionalFee { region: string; fee: number }
interface Settings { taxRate: number; deliveryFeeDefault: number; deliveryFeeByRegion: RegionalFee[] }

export default function SettingsPageClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<Settings>({ taxRate: 0, deliveryFeeDefault: 0, deliveryFeeByRegion: [] })

  const ghanaRegions = [
    'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern', 'Greater Accra',
    'North East', 'Northern', 'Oti', 'Savannah', 'Upper East', 'Upper West', 'Volta',
    'Western', 'Western North'
  ]

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (res.ok && json?.data && !ignore) {
          setForm({
            taxRate: Number(json.data.taxRate || 0),
            deliveryFeeDefault: Number(json.data.deliveryFeeDefault || 0),
            deliveryFeeByRegion: Array.isArray(json.data.deliveryFeeByRegion) ? json.data.deliveryFeeByRegion : [],
          })
        }
      } catch (e) {
        setError('Failed to load settings')
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => { ignore = true }
  }, [])

  const updateRegional = (idx: number, patch: Partial<RegionalFee>) => {
    setForm(prev => {
      const next = [...prev.deliveryFeeByRegion]
      next[idx] = { ...next[idx], ...patch }
      return { ...prev, deliveryFeeByRegion: next }
    })
  }

  const addRegional = () => setForm(prev => ({ ...prev, deliveryFeeByRegion: [...prev.deliveryFeeByRegion, { region: '', fee: 0 }] }))
  const removeRegional = (idx: number) => setForm(prev => ({ ...prev, deliveryFeeByRegion: prev.deliveryFeeByRegion.filter((_, i) => i !== idx) }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to save settings')
      setSuccess('Settings saved')
    } catch (e:any) {
      setError(e.message || 'Failed to save settings')
    } finally {
      setSaving(false)
      setTimeout(() => setSuccess(null), 2000)
    }
  }

  if (loading) {
    return <div className="rounded-lg border p-4">Loading settings…</div>
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">{success}</div>}

      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tax rate</label>
          <input
            type="number"
            step="0.001"
            min={0}
            max={1}
            value={form.taxRate}
            onChange={(e) => setForm(prev => ({ ...prev, taxRate: Number(e.target.value) }))}
            className="mt-1 block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Enter as decimal (e.g., 0.075 for 7.5%).</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Default delivery fee</label>
          <input
            type="number"
            min={0}
            step="1"
            value={form.deliveryFeeDefault}
            onChange={(e) => setForm(prev => ({ ...prev, deliveryFeeDefault: Number(e.target.value) }))}
            className="mt-1 block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Amount in base currency minor units (e.g., pesewas/kobo).</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Regional overrides</h2>
          <Button size="sm" onClick={addRegional}>Add region</Button>
        </div>

        <div className="space-y-3">
          {form.deliveryFeeByRegion.length === 0 && (
            <div className="text-sm text-gray-500">No regional overrides. Default delivery fee applies everywhere.</div>
          )}
          {form.deliveryFeeByRegion.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Region</label>
                <select
                  value={row.region}
                  onChange={(e) => updateRegional(idx, { region: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  <option value="">Select Region</option>
                  {ghanaRegions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Matches the region field in checkout.</p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Fee</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={row.fee}
                  onChange={(e) => updateRegional(idx, { fee: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="sm:col-span-5">
                <button
                  type="button"
                  onClick={() => removeRegional(idx)}
                  className="text-xs text-red-600 hover:text-red-700"
                >Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Button onClick={handleSave} loading={saving}>Save settings</Button>
      </div>
    </div>
  )
}
