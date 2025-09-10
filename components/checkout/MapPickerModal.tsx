"use client"

import React, { useEffect, useRef, useState } from 'react'

interface MapPickerModalProps {
  open: boolean
  apiKey: string
  lat?: number
  lon?: number
  initialQuery?: string
  onClose: () => void
  onConfirm: (coords: { lat: number; lon: number }) => void
}

// Load Leaflet CSS/JS from CDN if not already loaded
function ensureLeafletLoaded(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve()
    // @ts-ignore
    if (window.L && document.querySelector('link[data-leaflet]')) return resolve()

    // CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    link.setAttribute('data-leaflet', 'true')
    document.head.appendChild(link)

    // JS
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Leaflet'))
    document.body.appendChild(script)
  })
}

const MapPickerModal: React.FC<MapPickerModalProps> = ({ open, apiKey, lat, lon, initialQuery, onClose, onConfirm }) => {
  const mapEl = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [searching, setSearching] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let isCancelled = false
    ;(async () => {
      try {
        await ensureLeafletLoaded()
        if (isCancelled) return
        // @ts-ignore
        const L = window.L
        if (!mapRef.current && mapEl.current) {
          const startLat = typeof lat === 'number' ? lat : 5.6037 // Accra fallback
          const startLon = typeof lon === 'number' ? lon : -0.1870
          mapRef.current = L.map(mapEl.current).setView([startLat, startLon], 16)
          L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`, {
            attribution: 'Map data © OpenStreetMap contributors, © Geoapify'
          }).addTo(mapRef.current)
          markerRef.current = L.marker([startLat, startLon], { draggable: true }).addTo(mapRef.current)
        } else if (mapRef.current && markerRef.current) {
          const startLat = typeof lat === 'number' ? lat : 5.6037
          const startLon = typeof lon === 'number' ? lon : -0.1870
          mapRef.current.setView([startLat, startLon], 16)
          markerRef.current.setLatLng([startLat, startLon])
        }
        setIsReady(true)

        // If provided a query, try to geocode on open
        const q = (initialQuery || '').trim()
        if (q.length > 0) {
          try {
            const res = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(q)}&limit=1&apiKey=${apiKey}`)
            const data = await res.json().catch(() => ({}))
            const feat = Array.isArray(data?.features) && data.features.length > 0 ? data.features[0] : null
            const center = feat?.geometry?.coordinates
            if (center && Array.isArray(center) && center.length >= 2 && mapRef.current && markerRef.current) {
              const lon0 = Number(center[0]); const lat0 = Number(center[1])
              if (!isNaN(lat0) && !isNaN(lon0)) {
                mapRef.current.setView([lat0, lon0], 17)
                markerRef.current.setLatLng([lat0, lon0])
              }
            }
          } catch (e) {
            console.error('Initial geocode error:', e)
          }
        }
      } catch (e) {
        console.error(e)
      }
    })()
    return () => { isCancelled = true }
  }, [open, lat, lon, apiKey, initialQuery])

  const handleLocateMe = async () => {
    setGeoError(null)
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeoError('Geolocation is not supported by your browser.')
      return
    }
    try {
      setGeoBusy(true)
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 })
      })
      const currLat = pos.coords.latitude
      const currLon = pos.coords.longitude
      if (mapRef.current && markerRef.current && !isNaN(currLat) && !isNaN(currLon)) {
        mapRef.current.setView([currLat, currLon], 17)
        markerRef.current.setLatLng([currLat, currLon])
      }
    } catch (e: any) {
      setGeoError(e?.message || 'Unable to get current location')
    } finally {
      setGeoBusy(false)
    }
  }

  const handleConfirm = () => {
    if (!markerRef.current) return
    const ll = markerRef.current.getLatLng()
    onConfirm({ lat: ll.lat, lon: ll.lng })
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const q = searchText.trim()
    if (!q) return
    try {
      setSearching(true)
      const res = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(q)}&limit=1&apiKey=${apiKey}`)
      if (!res.ok) {
        console.error('Geocode API error:', res.status, res.statusText)
        return
      }
      const data = await res.json()
      console.log('Geocode response:', data)
      const feat = Array.isArray(data?.features) && data.features.length > 0 ? data.features[0] : null
      const center = feat?.geometry?.coordinates
      if (center && Array.isArray(center) && center.length >= 2 && mapRef.current && markerRef.current) {
        const lon0 = Number(center[0]); const lat0 = Number(center[1])
        if (!isNaN(lat0) && !isNaN(lon0)) {
          console.log('Moving map to:', lat0, lon0)
          mapRef.current.setView([lat0, lon0], 17)
          markerRef.current.setLatLng([lat0, lon0])
        } else {
          console.error('Invalid coordinates:', center)
        }
      } else {
        console.error('No valid location found for:', q)
      }
    } catch (e) {
      console.error('Search error:', e)
    } finally {
      setSearching(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg w-[95vw] max-w-2xl h-[75vh] p-4 flex flex-col">
        <h3 className="text-lg font-semibold mb-3">Pin your exact location</h3>
        <form onSubmit={handleSearch} className="mb-3 flex gap-2">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search for a place or address"
            className="flex-1 h-10 rounded-md border border-gray-300 px-3 text-sm"
          />
          <button type="submit" className="px-4 py-2 rounded-md border bg-white disabled:opacity-50" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>
        {/* Map Controls Toolbar (outside map) */}
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={handleLocateMe}
            className="inline-flex items-center gap-2 rounded-md bg-white shadow p-2 border hover:bg-gray-50 disabled:opacity-50"
            title="Center to my location"
            disabled={geoBusy}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v0m0 8v0m4-4H8m11 0a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm">My location</span>
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 rounded-md overflow-hidden border">
          <div ref={mapEl} className="h-full w-full" />
        </div>
        {geoError && (
          <p className="mt-2 text-xs text-red-600">{geoError}</p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <button className="px-4 py-2 rounded-md border" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50" onClick={handleConfirm} disabled={!isReady}>Use this location</button>
        </div>
      </div>
    </div>
  )
}

export { MapPickerModal }
