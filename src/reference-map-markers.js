import L from 'leaflet'

const icon=L.divIcon({className:'hradnik-reference-marker',html:'<img src="/icons/map-marker-reference.svg">',iconSize:[32,36],iconAnchor:[16,34]})
const clusterIcon=count=>L.divIcon({className:'hradnik-reference-cluster',html:`<span>${count>999?'999+':count}</span>`,iconSize:[42,42],iconAnchor:[21,21]})
let mapRef=null
let originalLayers=[]
let rendered=[]
let raf=0

function collect(){
  if(!mapRef)return
  originalLayers=mapRef._hradnikReferenceOriginals||[]
  mapRef.eachLayer(layer=>{
    if(layer.options?.fillColor&&layer.getLatLng&&!layer._hradnikLocation && layer.options.interactive!==false){
      if(!originalLayers.includes(layer)){
        originalLayers.push(layer)
        layer.setStyle?.({opacity:0,fillOpacity:0})
      }
    }
  })
  mapRef._hradnikReferenceOriginals=originalLayers
}

function clearRendered(){rendered.forEach(m=>m.remove());rendered=[]}

function render(){
  if(!mapRef)return
  collect()
  clearRendered()
  const zoom=mapRef.getZoom()
  const visible=originalLayers.filter(layer=>layer._map&&layer.getLatLng())
  if(zoom>=10){
    visible.forEach(layer=>{
      const m=L.marker(layer.getLatLng(),{icon,keyboard:true,zIndexOffset:100}).addTo(mapRef)
      const tooltip=layer.getTooltip?.()
      if(tooltip)m.bindTooltip(tooltip.getContent(),{direction:'top',offset:[0,-7]})
      m.on('click',()=>layer.fire('click'))
      rendered.push(m)
    })
    return
  }

  const cell=zoom<=7?54:46
  const groups=new Map()
  visible.forEach(layer=>{
    const point=mapRef.project(layer.getLatLng(),zoom)
    const key=`${Math.floor(point.x/cell)}:${Math.floor(point.y/cell)}`
    const group=groups.get(key)||[]
    group.push(layer)
    groups.set(key,group)
  })
  groups.forEach(group=>{
    if(group.length===1){
      const layer=group[0]
      const m=L.marker(layer.getLatLng(),{icon,keyboard:true,zIndexOffset:100}).addTo(mapRef)
      const tooltip=layer.getTooltip?.()
      if(tooltip)m.bindTooltip(tooltip.getContent(),{direction:'top',offset:[0,-7]})
      m.on('click',()=>layer.fire('click'))
      rendered.push(m)
      return
    }
    const lat=group.reduce((sum,l)=>sum+l.getLatLng().lat,0)/group.length
    const lng=group.reduce((sum,l)=>sum+l.getLatLng().lng,0)/group.length
    const m=L.marker([lat,lng],{icon:clusterIcon(group.length),keyboard:true,zIndexOffset:150}).addTo(mapRef)
    m.bindTooltip(`${group.length} památek`,{direction:'top',offset:[0,-18]})
    m.on('click',()=>{
      mapRef.setView([lat,lng],Math.min(12,zoom+2),{animate:true})
    })
    rendered.push(m)
  })
}

function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(render)}

L.Map.addInitHook(function(){
  if(this._container?.id!=='map')return
  mapRef=this
  window.__hradnikMap=this
  this.on('zoomend moveend',schedule)
  setTimeout(schedule,80)
})

setInterval(()=>{if(mapRef)render()},900)
