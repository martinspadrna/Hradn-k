# Hradník

PWA pro katalog hradů, zámků, zřícenin, tvrzí, klášterů a dalších dochovaných historických míst.

## Přihlášení

Hradník používá vlastní registraci **uživatelské jméno + heslo**. V aplikaci není potřeba zadávat e-mail ani používat sociální přihlášení.

Hesla se na serveru neukládají v otevřeném tvaru. Registrace a přihlášení řeší samostatná Edge Function `hradnik-auth`, která ukládá pouze PBKDF2 hash hesla a krátkodobě omezenou relaci.

## Architektura

- Frontend: Vite + vanilla JavaScript
- PWA: vite-plugin-pwa
- Mapa: Leaflet
- Katalog: `hradnik_places`
- Zdroje: `hradnik_sources`, `hradnik_place_sources`
- Osobní stav návštěv: `hradnik_user_place_state`
- Přihlášení: `hradnik_users`, `hradnik_sessions`, Edge Function `hradnik-auth`
- Aktualizace katalogu: `hradnik-sync` na pozadí

## Vývoj

```bash
npm ci
npm run dev
```

## Build

```bash
npm run build
```

## Bezpečnost

Do veřejného frontendu patří pouze Supabase publishable key. Service-role/secret klíče patří výhradně na server/Edge Functions.

Neověřené otevírací doby, ceny ani GPS se nemají vydávat za aktuální údaje.
