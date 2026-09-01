import L from 'leaflet'

// Map UX patch: keep monument names available on hover/touch even after
// the delayed current-location zoom, and ensure map-created overlays never
// sit above the monument detail sheet/close button.
const style = document.createElement('style')
style.textContent = `
  .overlay { z-index: 50000 !important; pointer-events: auto !important; }
  .overlay .sheet { position: relative !important; z-index: 50001 !important; pointer-events: auto !important; }
  .overlay .close { position: relative !important; z-index: 50002 !important; pointer-events: auto !important; }
`
document.head.appendChild(style)

function installMapUx(map) {
  if (!map || map._hradnikMapUxInstalled) return
  map._hradnikMapUxInstalled = true

  let hovered = null
  let lastPoint = null

  const markers = () => {
    const out = []
    map.eachLayer(layer => {
      if (!(layer instanceof L.CircleMarker)) return
      if (!layer._map) return
      if (layer.options?.interactive === false) return
      out.push(layer)
    })
    return out
  }

  const nearestMarker = (containerPoint) => {
    if (!containerPoint) return null
    let nearest = null
    let nearestPx = Infinity

    for (const layer of markers()) {
      const p = map.latLngToContainerPoint(layer.getLatLng())
      const dx = p.x - containerPoint.x
      const dy = p.y - containerPoint.y
      const px = Math.hypot(dx, dy)
      const hitRadius = Math.max(17, Number(layer.options?.radius || 6) + 11)
      if (px <= hitRadius && px < nearestPx) {
        nearest = layer
        nearestPx = px
      }
    }
    return nearest
  }

  const openTooltip = layer => {
    if (!layer?.getTooltip?.()) return
    try {
      layer.openTooltip()
      layer.bringToFront?.()
    } catch {}
  }

  const closeTooltip = layer => {
    if (!layer?.getTooltip?.()) return
    try { layer.closeTooltip() } catch {}
  }

  const setHovered = layer => {
    if (layer === hovered) {
      openTooltip(layer)
      return
    }
    closeTooltip(hovered)
    hovered = layer || null
    openTooltip(hovered)
  }

  map.on('layeradd', event => {
    const layer = event.layer
    if (!(layer instanceof L.CircleMarker)) return
    if (layer.options?.interactive === false) return
    if (layer._hradnikUxBound) return
    layer._hradnikUxBound = true

    const tooltip = layer.getTooltip?.()
    if (tooltip) tooltip.options.sticky = true

    layer.on('mouseover', () => setHovered(layer))
    layer.on('mouseout', () => {
      if (hovered === layer) {
        hovered = null
        closeTooltip(layer)
      }
    })
    layer.on('touchstart', () => setHovered(layer))

    // Keep the application's own marker click handler working, but stop the
    // click from also closing/changing the map state underneath the detail UI.
    layer.on('click', event => {
      if (event?.originalEvent) L.DomEvent.stopPropagation(event.originalEvent)
    })
  })

  map.on('mousemove', event => {
    lastPoint = event.containerPoint
    setHovered(nearestMarker(lastPoint))
  })

  map.on('zoomend moveend', () => {
    if (lastPoint) setHovered(nearestMarker(lastPoint))
    else if (hovered && !hovered._map) hovered = null
    requestAnimationFrame(() => map.invalidateSize())
  })

  map.getContainer()?.addEventListener('mouseleave', () => {
    if (hovered) closeTooltip(hovered)
    hovered = null
    lastPoint = null
  })
}

L.Map.addInitHook(function () {
  if (this._container?.id !== 'map') return
  installMapUx(this)
})
