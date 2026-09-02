import L from 'leaflet'
const icon=L.divIcon({className:'hradnik-reference-marker',html:'<img src="/icons/map-marker-reference.svg">',iconSize:[32,36],iconAnchor:[16,34]})
const done=new WeakSet()
function upgrade(){const map=window.__hradnikMap;if(!map)return;map.eachLayer(layer=>{if(done.has(layer)||!layer?.options?.fillColor||!layer.getLatLng)return;done.add(layer);const m=L.marker(layer.getLatLng(),{icon,keyboard:true}).addTo(map);m.on('click',()=>layer.fire('click'));layer.setStyle?.({opacity:0,fillOpacity:0})})}
L.Map.addInitHook(function(){if(this._container?.id==='map')window.__hradnikMap=this})
setInterval(upgrade,600)
