import L from 'leaflet'

// Map UX patch: keep monument names available on hover/touch even after
// delayed map moves and make monument dots forgiving to click with a mouse.
const style = document.createElement('style')
style.textContent = `
  .overlay { z-index: 50000 !important; pointer-events: auto !important; }
  .overlay .sheet { position: relative !important; z-index: 50001 !important; pointer-events: auto !important; }
  .overlay .close { position: relative !important; z-index: 50002 !important; pointer-events: auto !important; }
  .leaflet-overlay-pane svg path.leaflet-interactive { pointer-events: auto !important; }
`
document.head.appendChild(style)

function installMapUx(map) {
  if (!map || map._hradnikMapUxInstalled) return
  map._hradnikMapUxInstalled = true

  let hovered = null
  let lastPoint = null
  let lastOpenAt = 0

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

  const nearestMarker = (containerPoint, maxDistance = 28) => {
    if (!containerPoint) return null
    let nearest = null
    let nearestPx = Infinity

    for (const layer of markers()) {
      const p = map.latLngToContainerPoint(layer.getLatLng())
      const dx = p.x - containerPoint.x
      const dy = p.y - containerPoint.y
      const px = Math.hypot(dx, dy)
      const hitRadius = Math.max(maxDistance, Number(layer.options?.radius || 6) + 14)
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

  const openMarker = layer => {
    if (!layer) return false
    const now = Date.now()
    if (now - lastOpenAt < 250) return true
    lastOpenAt = now

    // main.js installs the actual detail handler on each marker.
    const handlers = layer._events?.click || []
    if (handlers.length) {
      layer.fire('click', { latlng: layer.getLatLng(), layer })
      return true
    }
    return false
  }

  map.on('layeradd', event => {
    const layer = event.layer
    if (!(layer instanceof L.CircleMarker)) return
    if (layer.options?.interactive === false) return
    if (layer._hradnikUxBound) return
    layer._hradnikUxBound = true

    const tooltip = layer.getTooltip?.()
    if (tooltip) {
      tooltip.options.sticky = true
      tooltip.options.permanent = false
      tooltip.options.interactive = false
    }

    layer.on('mouseover', () => setHovered(layer))
    layer.on('mouseout', () => {
      if (hovered === layer) {
        hovered = null
        closeTooltip(layer)
      }
    })
    layer.on('touchstart', () => setHovered(layer))

    // Keep Leaflet's normal click handling, but stop the click from bubbling
    // into the map itself and potentially changing the view underneath.
    layer.on('click', event => {
      if (event?.originalEvent) L.DomEvent.stopPropagation(event.originalEvent)
    })
  })

  map.on('mousemove', event => {
    lastPoint = event.containerPoint
    setHovered(nearestMarker(lastPoint))
  })

  // Desktop fallback: clicking within a comfortable hit area around a dot
  // opens that monument even when the tiny SVG circle itself was missed.
  map.on('click', event => {
    const target = event?.originalEvent?.target
    if (target && target.closest?.('.leaflet-interactive')) return
    const layer = nearestMarker(event.containerPoint, 30)
    if (!layer) return
    openMarker(layer)
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
