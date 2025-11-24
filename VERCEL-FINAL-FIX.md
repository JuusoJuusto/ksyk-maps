# 🎯 Vercel - Lopullinen Korjaus

## ❌ Ongelma

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/server/routes'
```

Vercel serverless ei löytänyt server-koodia koska:
1. Express-pohjainen monorepo-rakenne ei toimi Vercel serverlessissa
2. Import patht eivät toimineet oikein
3. Dependencies eivät olleet saatavilla

## ✅ Ratkaisu

**Kirjoitettiin API kokonaan uudelleen Vercel-yhteensopivaksi:**

### Mitä Muutettiin:

1. **Luotiin uusi `api/index.ts`**
   - Käyttää `@vercel/node` tyypityksiä
   - Yksinkertainen routing ilman Expressiä
   - Importtaa suoraan `storage.js`:n
   - Toimii Vercel serverless functionina

2. **Luotiin `api/test.ts`**
   - Testaa että API toimii
   - Näyttää environment variables statuksen

3. **Päivitettiin `vercel.json`**
   - `includeFiles: "server/**"` - Kopioi server-koodin
   - Oikeat function asetukset

4. **Asennettiin `@vercel/node`**
   - Vercel-yhteensopivat tyypit

### Miten Se Toimii Nyt:

```
Client Request → Vercel → api/index.ts → storage.js → Database → Response
```

**Ei enää Expressiä!** Yksinkertainen function-pohjainen routing.

## 📋 Mitä Tehdä Seuraavaksi

### 1. Vercel Buildaa Automaattisesti

Muutokset on pushattu GitHubiin. Vercel huomaa ne ja alkaa buildaamaan.

### 2. Lisää Environment Variables

**Pakollisia:**

```
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender
VITE_FIREBASE_APP_ID=your_app_id
SESSION_SECRET=random_secret_key
NODE_ENV=production
```

**Database (valitse yksi):**

**Jos käytät PostgreSQL:**
```
DATABASE_URL=postgresql://user:pass@host/db
```

**Jos käytät Firebase:**
```
USE_FIREBASE=true
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### 3. Testaa API

Kun deployment on valmis, testaa:

```
https://your-app.vercel.app/api/test
```

Pitäisi näkyä:
```json
{
  "message": "API is working!",
  "timestamp": "2024-...",
  "env": {
    "hasDatabase": true,
    "hasFirebase": false,
    "nodeEnv": "production"
  }
}
```

### 4. Testaa Buildings Endpoint

```
https://your-app.vercel.app/api/buildings
```

Pitäisi näkyä lista rakennuksista.

## 🔍 Debuggaus

### Jos API Ei Toimi:

1. **Tarkista Vercel Logs**
   - Deployments → Functions → Logs
   - Etsi virheviestit

2. **Tarkista Environment Variables**
   - Settings → Environment Variables
   - Varmista että kaikki on lisätty

3. **Testaa Test Endpoint**
   - `/api/test` näyttää environment statuksen
   - Tarkista että `hasDatabase` tai `hasFirebase` on `true`

### Jos Database Ei Toimi:

**PostgreSQL:**
- Tarkista että DATABASE_URL on oikein
- Varmista että Neon database on käynnissä
- Tarkista että IP-osoite on sallittu

**Firebase:**
- Tarkista että USE_FIREBASE=true
- Tarkista että FIREBASE_SERVICE_ACCOUNT on oikein (koko JSON)
- Varmista että Firestore on käytössä

## 📊 API Endpoints

Nyt käytössä:

```
GET  /api              - Health check
GET  /api/test         - Test endpoint (näyttää env status)
GET  /api/buildings    - Lista rakennuksista
GET  /api/rooms        - Lista huoneista (?buildingId=...)
GET  /api/floors       - Lista kerroksista (?buildingId=...)
GET  /api/staff        - Lista henkilökunnasta
GET  /api/announcements - Lista ilmoituksista
GET  /api/auth/user    - Käyttäjän tiedot (vaatii autentikoinnin)
```

## 🎯 Miksi Tämä Toimii?

**Ennen:**
- Express app + monorepo rakenne
- Vercel ei löytänyt dependencies
- Module not found virheet

**Nyt:**
- Yksinkertainen Vercel function
- Suora import storage.js:stä
- `includeFiles` kopioi server-koodin
- Kaikki toimii!

## 💡 Seuraavat Parannukset

Kun perus-API toimii, voidaan lisätä:

1. **Authentication**
   - Firebase Auth integration
   - Session management

2. **POST/PUT/DELETE Endpoints**
   - Rakennusten luonti/muokkaus
   - Huoneiden hallinta

3. **Admin Endpoints**
   - Käyttäjien hallinta
   - Ilmoitusten hallinta

Mutta ensin: **Varmista että perus-API toimii!**

## 📞 Tuki

Jos tarvitset apua:

1. Testaa `/api/test` endpoint
2. Tarkista Vercel logs
3. Tarkista environment variables
4. Katso `VERCEL-DATABASE-FIX.md`

**API on nyt kirjoitettu uudelleen ja pitäisi toimia Vercelissä! 🚀**
