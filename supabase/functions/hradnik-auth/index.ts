import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' }
const enc = new TextEncoder()
function json(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:CORS})}
function norm(v:string){return v.trim().toLowerCase()}
function validUsername(v:string){return /^[a-z0-9][a-z0-9._-]{2,31}$/i.test(v)}
function validPassword(v:string){return typeof v==='string' && v.length>=8 && v.length<=128}
function b64u(bytes:Uint8Array){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64u(s:string){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s);return Uint8Array.from(bin,c=>c.charCodeAt(0))}
async function sha256(bytes:Uint8Array){return new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))}
async function hashPassword(password:string){const salt=new Uint8Array(16);crypto.getRandomValues(salt);const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},key,256);return `pbkdf2-sha256$150000$${b64u(salt)}$${b64u(new Uint8Array(bits))}`}
function equal(a:Uint8Array,b:Uint8Array){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a[i]^b[i];return x===0}
async function verifyPassword(password:string,stored:string){const p=stored.split('$');if(p.length!==4||p[0]!=='pbkdf2-sha256')return false;const iterations=Number(p[1]),salt=unb64u(p[2]),want=unb64u(p[3]);const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations,hash:'SHA-256'},key,want.length*8);return equal(new Uint8Array(bits),want)}
async function token(){const b=new Uint8Array(32);crypto.getRandomValues(b);return b64u(b)}
async function tokenHash(t:string){return b64u(await sha256(enc.encode(t)))}
async function createSession(userId:string){const raw=await token(),hash=await tokenHash(raw);await db.from('hradnik_sessions').delete().lt('expires_at',new Date().toISOString());const expires=new Date(Date.now()+1000*60*60*24*30);const {error}=await db.from('hradnik_sessions').insert({user_id:userId,token_hash:hash,expires_at:expires.toISOString()});if(error)throw error;return{token:raw,expires_at:expires.toISOString()}}
async function authUser(req:Request){const h=req.headers.get('authorization')||'';if(!h.toLowerCase().startsWith('bearer '))return null;const raw=h.slice(7).trim();if(!raw)return null;const {data,error}=await db.from('hradnik_sessions').select('user_id,expires_at,hradnik_users(username,display_name)').eq('token_hash',await tokenHash(raw)).gt('expires_at',new Date().toISOString()).maybeSingle();if(error||!data)return null;const u=(data as any).hradnik_users||{};return{raw,userId:data.user_id,username:u.username||'',displayName:u.display_name||''}}
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:CORS})
 if(req.method!=='POST')return json({ok:true,service:'hradnik-auth'})
 let body:any;try{body=await req.json()}catch{return json({error:'Neplatné JSON.'},400)}
 try{
  if(body.action==='register'){
   const username=norm(body.username||''),password=body.password||'';if(!validUsername(username))return json({error:'Uživatelské jméno musí mít 3–32 znaků a používat jen písmena, čísla, tečku, pomlčku nebo podtržítko.'},400);if(!validPassword(password))return json({error:'Heslo musí mít alespoň 8 znaků.'},400);const exists=await db.from('hradnik_users').select('id').eq('username',username).maybeSingle();if(exists.data)return json({error:'Toto uživatelské jméno už existuje.'},409);const {data:user,error}=await db.from('hradnik_users').insert({username,password_hash:await hashPassword(password),display_name:username}).select('id,username,display_name').single();if(error)throw error;return json({ok:true,user,session:await createSession(user.id)})
  }
  if(body.action==='login'){
   const username=norm(body.username||''),password=body.password||'';const {data:user}=await db.from('hradnik_users').select('id,username,password_hash,display_name').eq('username',username).maybeSingle();if(!user||!(await verifyPassword(password,user.password_hash)))return json({error:'Neplatné uživatelské jméno nebo heslo.'},401);await db.from('hradnik_users').update({last_login_at:new Date().toISOString()}).eq('id',user.id);return json({ok:true,user:{id:user.id,username:user.username,display_name:user.display_name},session:await createSession(user.id)})
  }
  const me=await authUser(req)
  if(body.action==='session'||body.action==='me')return me?json({ok:true,user:{id:me.userId,username:me.username,display_name:me.displayName}}):json({error:'Neplatná relace.'},401)
  if(body.action==='logout'){if(me)await db.from('hradnik_sessions').delete().eq('token_hash',await tokenHash(me.raw));return json({ok:true})}
  if(!me)return json({error:'Nepřihlášený uživatel.'},401)
  if(body.action==='state_list'){const {data,error}=await db.from('hradnik_user_place_state').select('place_id,status,favorite,rating,visited_on,note').eq('user_id',me.userId);if(error)throw error;return json({ok:true,state:data||[]})}
  if(body.action==='state_upsert'){const placeId=Number(body.place_id),status=body.status||'none',favorite=!!body.favorite,rating=Math.max(0,Math.min(5,Number(body.rating)||0)),visited_on=body.visited_on||null,note=String(body.note||'').slice(0,5000);if(!Number.isSafeInteger(placeId))return json({error:'Neplatné místo.'},400);if(!['none','want','visited'].includes(status))return json({error:'Neplatný stav.'},400);const {data,error}=await db.from('hradnik_user_place_state').upsert({user_id:me.userId,place_id:placeId,status,favorite,rating,visited_on,note,updated_at:new Date().toISOString()},{onConflict:'user_id,place_id'}).select('place_id,status,favorite,rating,visited_on,note').single();if(error)throw error;return json({ok:true,state:data})}
  return json({error:'Neznámá akce.'},400)
 }catch(e){console.error(e);return json({error:'Interní chyba Hradníku.'},500)}
})