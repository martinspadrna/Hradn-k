import L from 'leaflet'

const style=document.createElement('style')
style.textContent=`.overlay{z-index:10000!important}.overlay .sheet{z-index:10001!important}.leaflet-container{background:#0d1210!important}.hradnik-map-style{display:flex!important;overflow:hidden!important;margin-top:14px!important;margin-right:14px!important;border:1px solid #3a4449!important;border-radius:9px!important;background:rgba(9,14,17,.95)!important;box-shadow:0 7px 20px rgba(0,0,0,.35)!important}.hradnik-map-style button{height:36px!important;padding:0 11px!important;border:0!important;background:transparent!important;color:#aeb7bc!important;font-size:11px!important;font-weight:900!important;cursor:pointer!important}.hradnik-map-style button+button{border-left:1px solid #303a3f!important}.hradnik-map-style button.active{background:#342d1e!important;color:#f0c44a!important}@media(max-width:520px){.leaflet-control-zoom a{width:40px!important;height:40px!important;line-height:40px!important}.hradnik-map-style{margin-top:10px!important;margin-right:10px!important}.hradnik-map-style button{height:38px!important;padding:0 9px!important;font-size:10px!important}}`
document.head.appendChild(style)

const SATELLITE_URL='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const SATELLITE_ATTR='Tiles © Esri, Maxar, Earthstar Geographics'
const MAP_URL='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const MAP_ATTR='© OpenStreetMap contributors'
const STYLE_KEY='hradnik_map_style_v1'

function tileLayers(map){const out=[];map.eachLayer(layer=>{if(layer instanceof L.TileLayer)out.push(layer)});return out}
function satelliteLayer(map){if(!map._hradnikSatellite)map._hradnikSatellite=L.tileLayer(SATELLITE_URL,{maxZoom:19,attribution:SATELLITE_ATTR});return map._hradnikSatellite}
function mapLayer(map){if(!map._hradnikStandard)map._hradnikStandard=L.tileLayer(MAP_URL,{maxZoom:19,attribution:MAP_ATTR});return map._hradnikStandard}
function desired(){return localStorage.getItem(STYLE_KEY)==='map'?'map':'satellite'}
function setButtons(map,value){map._hradnikStyleControl?._container?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.style===value))}
function activate(map,value=desired()){
  if(!map?._container?.isConnected)return
  const target=value==='map'?mapLayer(map):satelliteLayer(map)
  tileLayers(map).forEach(layer=>{if(layer!==target)map.removeLayer(layer)})
  if(!map.hasLayer(target))target.addTo(map)
  map._container.classList.toggle('hradnik-reference-satellite',value==='satellite')
  localStorage.setItem(STYLE_KEY,value);map._hradnikMapStyle=value;setButtons(map,value)
}
function installControl(map){
  if(map._hradnikStyleControl)return
  const Control=L.Control.extend({options:{position:'topright'},onAdd(){const wrap=L.DomUtil.create('div','hradnik-map-style leaflet-control');wrap.innerHTML='<button type="button" data-style="map">Mapa</button><button type="button" data-style="satellite">Satelit</button>';L.DomEvent.disableClickPropagation(wrap);wrap.querySelectorAll('button').forEach(b=>L.DomEvent.on(b,'click',()=>activate(map,b.dataset.style)));return wrap}})
  map._hradnikStyleControl=new Control();map.addControl(map._hradnikStyleControl);setButtons(map,desired())
}

L.Map.addInitHook(function(){
  if(this._container?.id!=='map')return
  const map=this;installControl(map)
  ;[0,60,180,450].forEach(ms=>setTimeout(()=>activate(map,desired()),ms))
})
