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

      map._hradnikLocationCircle?.remove()
      map._hradnikLocationMarker?.remove()

      map._hradnikLocationCircle = L.circle(center, {
        radius: RADIUS_METERS,
        color: '#7657ff',
        weight: 2,
        opacity: 0.65,
        fillColor: '#7657ff',
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(map)

      map._hradnikLocationMarker = L.circleMarker(center, {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: '#7657ff',
        fillOpacity: 1,
        interactive: false,
      }).addTo(map)

      const bounds = map._hradnikLocationCircle.getBounds()
      map.fitBounds(bounds, { padding: [18, 18], maxZoom: 11, animate: false })
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
