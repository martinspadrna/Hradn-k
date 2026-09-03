import L from 'leaflet'

const style = document.createElement('style')
style.textContent = `.overlay{z-index:10000!important}.overlay .sheet{z-index:10001!important}.hradnik-map-toggle{display:flex;background:#10151a;border:1px solid rgba(255,255,255,.12);border-radius:10px;overflow:hidden;box-shadow:0 2px 12px #0008}.hradnik-map-toggle button{border:0;border-radius:0;padding:9px 11px;min-width:82px;background:#10151a;color:#9aa0a8;font-weight:800;font-size:12px;cursor:pointer}.hradnik-map-toggle button+button{border-left:1px solid rgba(255,255,255,.08)}.hradnik-map-toggle button.active{background:#181b20;color:#e4ad19;box-shadow:inset 0 -2px 0 #e4ad19}.hradnik-dark-tiles img{filter:brightness(.58) contrast(1.18) saturate(.72)}@media(max-width:520px){.hradnik-map-toggle button{min-width:74px;padding:10px 8px;font-size:11px}.leaflet-control-zoom a{width:40px!important;height:40px!important;line-height:40px!important}}`
document.head.appendChild(style)

const STANDARD_URL='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const STANDARD_ATTR='© OpenStreetMap contributors'

function tileLayers(map){
  const out=[]
  map.eachLayer(layer=>{if(layer instanceof L.TileLayer)out.push(layer)})
  return out
}

function addStandard(map){
  const layers=tileLayers(map)
  const standard=layers.find(layer=>layer._url?.includes('tile.openstreetmap.org'))
  if(standard){if(!map.hasLayer(standard))standard.addTo(map);return standard}
  layers.forEach(layer=>map.removeLayer(layer))
  return L.tileLayer(STANDARD_URL,{maxZoom:19,attribution:STANDARD_ATTR}).addTo(map)
}

function addDarkMapClass(map){
  const pane=map.getPane('tilePane')
  if(pane) pane.classList.add('hradnik-dark-tiles')
}

function installToggle(){
  const map=this
  if(map._hradnikLayerToggle)return

  const satellite=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri, Maxar, Earthstar Geographics'})
  const Control=L.Control.extend({
    options:{position:'topright'},
    onAdd(){
      const wrap=L.DomUtil.create('div','hradnik-map-toggle leaflet-bar')
      const standard=L.DomUtil.create('button','',wrap)
      const aerial=L.DomUtil.create('button','',wrap)
      standard.type='button';aerial.type='button'
      standard.textContent='🗺️ Mapa';aerial.textContent='🛰️ Letecká'
      standard.classList.add('active')

      const normal=()=>{if(satellite._map)map.removeLayer(satellite);addStandard(map);addDarkMapClass(map);standard.classList.add('active');aerial.classList.remove('active')}
      const sat=()=>{tileLayers(map).forEach(layer=>{if(layer!==satellite)map.removeLayer(layer)});if(!map.hasLayer(satellite))satellite.addTo(map);const pane=map.getPane('tilePane');pane?.classList.remove('hradnik-dark-tiles');aerial.classList.add('active');standard.classList.remove('active')}
      L.DomEvent.disableClickPropagation(wrap)
      L.DomEvent.on(standard,'click',normal)
      L.DomEvent.on(aerial,'click',sat)
      return wrap
    }
  })
  map.addControl(new Control())
  map._hradnikLayerToggle=true

  setTimeout(()=>{
    if(!map._container?.isConnected)return
    if(!tileLayers(map).some(layer=>layer._url?.includes('tile.openstreetmap.org'))){
      addStandard(map)
    }
    addDarkMapClass(map)
  },0)
}

L.Map.addInitHook(installToggle)