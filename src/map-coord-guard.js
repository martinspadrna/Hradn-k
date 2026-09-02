import L from 'leaflet'

// Prevent missing coordinates (null/undefined/NaN) from becoming [0, 0]
// through Number(null) and placing a monument in the Atlantic Ocean.
const hasValidCoord = (value) => {
  if (value == null || value === '') return false
  const n = Number(value)
  return Number.isFinite(n) && n >= -90 && n <= 90
}

const validLatLng = (latlng) => {
  if (Array.isArray(latlng)) {
    const lat = Number(latlng[0])
    const lng = Number(latlng[1])
    return hasValidCoord(lat) && hasValidCoord(lng) && lng >= -180 && lng <= 180
  }
  if (!latlng || typeof latlng !== 'object') return false
  return validLatLng([latlng.lat, latlng.lng])
}

const originalCircleMarker = L.circleMarker
L.circleMarker = function (latlng, options) {
  const marker = originalCircleMarker.call(this, latlng, options)
  marker._hradnikInvalidCoordinate = !validLatLng(latlng)
  return marker
}

const originalAddTo = L.CircleMarker.prototype.addTo
L.CircleMarker.prototype.addTo = function (map) {
  if (this._hradnikInvalidCoordinate) return this
  return originalAddTo.call(this, map)
}

const originalLatLngBounds = L.latLngBounds
L.latLngBounds = function (cornersLatLng, corner2LatLng) {
  if (Array.isArray(cornersLatLng) && corner2LatLng == null) {
    const filtered = cornersLatLng.filter(validLatLng)
    if (filtered.length) return originalLatLngBounds.call(this, filtered)
  }
  return originalLatLngBounds.apply(this, arguments)
}
