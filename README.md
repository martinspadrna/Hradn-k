# Hradník

PWA pro katalog hradů, zámků, zřícenin, tvrzí, klášterů a dalších dochovaných historických míst.

## Architektura

- Frontend: Vite + vanilla JS
- PWA: vite-plugin-pwa
- Mapa: Leaflet
- Backend: Domácnost+ Supabase projekt `cgshssdjgzzuprlwnabl`
- osobní stav: `hradnik_place_state`
- katalog: `hradnik_places`
- zdroje: `hradnik_sources`, `hradnik_place_sources`
- background sync: `hradnik-sync` Edge Function + pg_cron každých 6 hodin

Frontend nikdy nespouští import katalogu. Pouze načítá databázi a ukládá osobní stav.

## Lokální spuštění

1. zkopíruj `.env.example` do `.env.local`
2. vyplň publishable Supabase key
3. `npm ci`
4. `npm run dev`

## Build

`npm run build`

## Nasazení

Repo je připravené pro GitHub Actions a statický host (Vercel/Cloudflare Pages/GitHub Pages s vhodnou konfigurací).

## Bezpečnost

Do frontendového `.env` patří pouze Supabase URL + publishable key. Nikdy sem nedávej service role key.
