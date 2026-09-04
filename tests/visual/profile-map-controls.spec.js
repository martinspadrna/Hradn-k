import { test, expect } from '@playwright/test'

const places=[
  {id:1,name:'Hrad Test',kind:'Hrad',character:'hrad',district:'Trutnov',region:'Královéhradecký',municipality:'Hostinné',latitude:50.54,longitude:15.72,description:'Dochovaný hrad',official_url:null,ticket_url:null,opening_hours:null,ticket_prices:null,photo_urls:[]},
  {id:2,name:'Zřícenina Test',kind:'Zřícenina',character:'zřícenina',district:'Jičín',region:'Královéhradecký',municipality:'Testov',latitude:50.44,longitude:15.35,description:'Zřícenina hradu',official_url:null,ticket_url:null,opening_hours:null,ticket_prices:null,photo_urls:[]}
]

async function boot(page){
  await page.addInitScript(()=>localStorage.setItem('hradnik_session','visual-regression-session'))
  await page.route('**/rest/v1/hradnik_places*',route=>route.fulfill({status:200,contentType:'application/json',headers:{'content-range':'0-1/2'},body:JSON.stringify(places)}))
  await page.route('**/functions/v1/hradnik-auth',route=>{
    let body={};try{body=route.request().postDataJSON()||{}}catch{}
    if(body.action==='me'||body.action==='session')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,user:{id:'visual-test',username:'visual-test',display_name:'Visual Test'}})})
    if(body.action==='state_list')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({state:[]})})
    if(body.action==='state_upsert')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({state:{place_id:body.place_id,status:body.status||'none',favorite:!!body.favorite}})})
    return route.fulfill({status:200,contentType:'application/json',body:'{}'})
  })
  await page.goto('/')
  await expect(page.locator('.redesign-sidebar .redesign-nav > button')).toHaveCount(6,{timeout:15000})
  await expect(page.locator('#map')).toBeVisible({timeout:10000})
}

async function closeDetail(page){
  const close=page.locator('.overlay .close')
  await expect(close).toBeVisible({timeout:3000})
  await close.click()
  await expect(page.locator('.overlay')).toHaveCount(0)
}

test('profile entry opens the signed-in profile',async({page})=>{
  await boot(page)
  if(test.info().project.name==='desktop'){
    await expect(page.locator('.reference-profile-button')).toBeVisible({timeout:5000})
    await page.locator('.reference-profile-button').click()
  }else{
    await page.locator('.mobileHeaderMenu').click()
    await expect(page.locator('[data-ref-mobile="profile"]')).toBeVisible({timeout:5000})
    await page.locator('[data-ref-mobile="profile"]').click()
  }
  await expect(page.locator('.hradnik-profile-overlay')).toBeVisible()
  await expect(page.locator('.hradnik-profile-user')).toContainText('Visual Test')
  await expect(page.locator('.hradnik-profile-user')).toContainText('@visual-test')
})

test('map style can switch between map and satellite',async({page})=>{
  await boot(page)
  await closeDetail(page)
  const control=page.locator('.hradnik-map-style')
  await expect(control).toBeVisible({timeout:5000})
  const map=control.locator('button[data-style="map"]')
  const sat=control.locator('button[data-style="satellite"]')
  await map.click();await expect(map).toHaveClass(/active/)
  await expect(page.locator('#map')).not.toHaveClass(/hradnik-reference-satellite/)
  await sat.click();await expect(sat).toHaveClass(/active/)
  await expect(page.locator('#map')).toHaveClass(/hradnik-reference-satellite/)
})
