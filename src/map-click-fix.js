import L from 'leaflet'

function installMapClickFallback(map) {
  if (!map || map._hradnikClickFallbackInstalled) return
  map._hradnikClickFallbackInstalled = true

  // Prevent marker clicks from bubbling to the map while keeping the
  // marker's own click handlers intact.
  map.on('layeradd', event => {
    const layer = event.layer
    if (!(layer instanceof L.CircleMarker) || layer._hradnikClickGuard) return
    layer._hradnikClickGuard = true
    layer.on('click', e => L.DomEvent.stopPropagation(e))
  })

  const findNearestMarker = event => {
    const point = event.containerPoint
    if (!point) return null

    let nearest = null
    let nearestPx = Infinity
    map.eachLayer(layer => {
      if (!(layer instanceof L.CircleMarker)) return
      if (!layer._map) return
      if (!layer.options?.interactive) return
      const ll = layer.getLatLng()
      const layerPoint = map.latLngToContainerPoint(ll)
      const dx = layerPoint.x - point.x
      const dy = layerPoint.y - point.y
      const px = Math.sqrt(dx * dx + dy * dy)
      const hitRadius = Math.max(18, Number(layer.options.radius || 6) + 12)
      if (px <= hitRadius && px < nearestPx) {
        nearest = layer
        nearestPx = px
      }
    })
    return nearest
  }

  map.on('click', event => {
    const marker = findNearestMarker(event)
    if (!marker) return
    marker.fire('click', { latlng: marker.getLatLng(), originalEvent: event.originalEvent })
  })
}

L.Map.addInitHook(function () {
  if (this._container?.id !== 'map') return
  installMapClickFallback(this)
})
