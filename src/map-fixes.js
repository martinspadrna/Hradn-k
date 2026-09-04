import L from 'leaflet'

/* Reference map: satellite imagery is the default, matching the approved visual. */
const style=document.createElement('style')
style.textContent=`.overlay{z-index:10000!important}.overlay .sheet{z-index:10001!important}.leaflet-container{background:#0d1210!important}@media(max-width:520px){.leaflet-control-zoom a{width:40px!important;height:40px!important;line-height:40px!important}}`
document.head.appendChild(style)

const SATELLITE_URL='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const SATELLITE_ATTR='Tiles © Esri, Maxar, Earthstar Geographics'

function tileLayers(map){const out=[];map.eachLayer(layer=>{if(layer instanceof L.TileLayer)out.push(layer)});return out}
function satelliteLayer(map){
  if(map._hradnikSatellite)return map._hradnikSatellite
  map._hradnikSatellite=L.tileLayer(SATELLITE_URL,{maxZoom:19,attribution:SATELLITE_ATTR})
  return map._hradnikSatellite
}
function activateSatellite(map){
  if(!map?._container?.isConnected)return
  const satellite=satelliteLayer(map)
  tileLayers(map).forEach(layer=>{if(layer!==satellite)map.removeLayer(layer)})
  if(!map.hasLayer(satellite))satellite.addTo(map)
  map._container.classList.add('hradnik-reference-satellite')
}

L.Map.addInitHook(function(){
  if(this._container?.id!=='map')return
  const map=this
  // main.js adds its OSM layer just after the map constructor; repeat briefly so
  // the final active layer is deterministically the reference satellite layer.
  ;[0,60,180,450].forEach(ms=>setTimeout(()=>activateSatellite(map),ms))
})
