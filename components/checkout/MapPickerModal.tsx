"use client"

import React, { useEffect, useRef, useState } from 'react'

interface MapPickerModalProps {
  open: boolean
  apiKey: string
  lat?: number
  lon?: number
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

const MapPickerModal: React.FC<MapPickerModalProps> = ({ open, apiKey, lat, lon, onClose, onConfirm }) => {
  const mapEl = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)

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
      } catch (e) {
        console.error(e)
      }
    })()
    return () => { isCancelled = true }
  }, [open, lat, lon, apiKey])

  const handleConfirm = () => {
    if (!markerRef.current) return
    const ll = markerRef.current.getLatLng()
    onConfirm({ lat: ll.lat, lon: ll.lng })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg w-[95vw] max-w-2xl h-[75vh] p-4 flex flex-col">
        <h3 className="text-lg font-semibold mb-3">Pin your exact location</h3>
        <div ref={mapEl} className="flex-1 rounded-md overflow-hidden border" />
        <div className="mt-4 flex justify-end gap-3">
          <button className="px-4 py-2 rounded-md border" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50" onClick={handleConfirm} disabled={!isReady}>Use this location</button>
        </div>
      </div>
    </div>
  )
}

export { MapPickerModal }
