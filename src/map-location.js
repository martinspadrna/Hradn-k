import L from 'leaflet'

const RADIUS_METERS = 25000
const LOCATION_OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 }

function setupCurrentLocation(map) {
  if (!map || map._hradnikLocationStarted) return
  if (map._container?.id !== 'map') return
  map._hradnikLocationStarted = true

  if (!navigator.geolocation) return

  navigator.geolocation.getCurrentPosition(
    position => {
      if (!map._container?.isConnected) return

      const lat = position.coords.latitude
      const lon = position.coords.longitude
      const center = [lat, lon]
      map._hradnikLocation = center

      // Keep the 25 km radius only as a zoom target; do not draw the radius itself.
      map._hradnikLocationMarker?.remove()
      map._hradnikLocationMarker = L.circleMarker(center, {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: '#7057f5',
        fillOpacity: 1,
        interactive: false,
        pane: 'markerPane',
      }).addTo(map)

      const latDelta = RADIUS_METERS / 111320
      const cos = Math.max(0.2, Math.cos(lat * Math.PI / 180))
      const lonDelta = RADIUS_METERS / (111320 * cos)
      const southWest = [lat - latDelta, lon - lonDelta]
      const northEast = [lat + latDelta, lon + lonDelta]
      map.fitBounds(L.latLngBounds(southWest, northEast), {
        padding: [18, 18],
        maxZoom: 11,
        animate: false,
      })
    },
    () => {
      // User denied location or the device could not determine it.
      // Keep the existing Czech Republic fallback view.
    },
    LOCATION_OPTIONS,
  )
}

const originalFitBounds = L.Map.prototype.fitBounds
L.Map.prototype.fitBounds = function (...args) {
  const result = originalFitBounds.apply(this, args)
  setupCurrentLocation(this)
  return result
}
