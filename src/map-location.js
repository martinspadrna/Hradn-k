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

      // Show only the current-position point. The 25 km radius is used
      // exclusively to choose the initial zoom; no visible circle is drawn.
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
      // Permission denied / location unavailable: keep the existing fallback view.
    },
    LOCATION_OPTIONS,
  )
}

// Start location lookup when the map is created instead of monkey-patching
// fitBounds. This prevents the location callback from interfering with later
// map moves, hover state and marker interactions.
L.Map.addInitHook(function () {
  if (this._container?.id !== 'map') return
  setupCurrentLocation(this)
})
