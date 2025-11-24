# 🔧 Vercel Korjaus - Yhteenveto

## ❌ Ongelma

Vercel näytti JavaScript-koodin tekstinä sivun sijaan:
```
(()=>{var e=Object.create;var r=Object.defineProperty...
```

## 🔍 Syy

Vercel ei ajanut Express-serveriä serverless functionina, vaan palveli buildattua `dist/index.js` tiedostoa staattisena tiedostona.

## ✅ Ratkaisu

### 1. Luotiin `api/index.ts`

Uusi tiedosto joka toimii Vercel serverless functionina:
- Importtaa Express app
- Rekisteröi kaikki API-reitit
- Exporttaa app:n Vercelille

### 2. Päivitettiin `vercel.json`

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Muutokset:**
- `buildCommand`: Käyttää npm run build
- `outputDirectory`: Osoittaa oikeaan kansioon (dist/public)
- `rewrites`: Ohjaa API-kutsut `/api` endpointtiin, muut index.html:ään

### 3. Korjattiin `package.json`

```json
"build": "vite build"
```

Poistettu esbuild server buildi, koska Vercel hoitaa sen automaattisesti.

## 📋 Seuraavat Askeleet

### 1. Push GitHubiin

```bash
git add .
git commit -m "Fix Vercel configuration for serverless deployment"
git push
```

### 2. Lisää Environment Variables Verceliin

Mene Vercel Dashboard → Settings → Environment Variables

Lisää nämä:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `DATABASE_URL`
- `SESSION_SECRET`
- `NODE_ENV=production`

### 3. Redeploy

Deployments → ... → Redeploy

### 4. Testaa

Avaa: `https://ksyk-maps.vercel.app`

Pitäisi näkyä oikea sivu, ei JavaScript-koodia!

## 🎯 Miksi Tämä Toimii?

**Ennen:**
- Vercel buildasi projektin
- Palveli `dist/index.js` staattisena tiedostona
- Selain näki JavaScript-koodin

**Nyt:**
- Vercel buildaa frontendin → `dist/public`
- API-kutsut menevät → `api/index.ts` (serverless function)
- Frontend-kutsut menevät → `dist/public/index.html`
- Express-server ajaa serverless functionina
- Kaikki toimii!

## 📚 Lisätietoa

Katso yksityiskohtaiset ohjeet: `VERCEL-OHJEET.md`
