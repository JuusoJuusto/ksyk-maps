# 🗺️ KSYK Campus Maps

**Versio 2.0.1** - Ammattimainen Interaktiivinen Kampusnavigointijärjestelmä

Interaktiivinen kampuskartta KSYK:lle. Luo mukautettuja rakennuksia, hallinnoi huoneita, navigoi sijaintien välillä ja jaa kartta kaikille!

## ✨ Ominaisuudet

### 🗺️ Navigointi & Kartat
- 🧭 **Älykäs Navigointi** - Google Maps -tyylinen reittisuunnittelu A* algoritmilla
- 🎯 **Visuaalinen Reitti** - Animoidut siniset polut näyttävät reitin
- 📍 **Reittipisteet** - Numeroitu vaiheet sykkivillä alku/loppu merkkeillä
- 🏢 **3D Rakennukset** - Monikerroksinen varjostus ja dynaamiset gradientit
- 🎨 **Mukautetut Muodot** - Piirrä monikulmiorakennuksia värivalitsimella
- 🗺️ **Interaktiivinen Kartta** - Vedä, zoomaa ja tutki kampusta

### 👥 Henkilöstöhallinta
- 📊 **Henkilöstö Dashboard** - Täydelliset CRUD-toiminnot henkilöstölle
- 🔍 **Haku & Suodatus** - Etsi henkilöstöä nimen, aseman tai osaston mukaan
- 🌐 **Monikielinen** - Tuki englanniksi ja suomeksi
- 📧 **Yhteystiedot** - Sähköposti ja puhelinnumero hallinta
- ✅ **Tilan Seuranta** - Aktiiviset/ei-aktiiviset henkilöstön jäsenet

### 🏗️ Rakennus & Huonehallinta
- 🏗️ **Mukautetut Rakennukset** - Klikkaa ja piirrä mitä tahansa muotoja
- 🚪 **Huoneen Tiedot** - Kapasiteetti, varusteet ja tyyppi
- 🛤️ **Käytävät** - Yhdistä huoneita säädettävän levyisillä käytävillä
- 🎨 **Täysi Väripaletti** - Mukauta rakennus- ja huonevärejä
- 📏 **Kerrosten Hallinta** - Monikerroksinen tuki kerrosnavigoinnilla

### 📢 Viestintä
- 📣 **Ilmoitukset** - Prioriteettiin perustuvat kampusilmoitukset
- 🔔 **Banneri Näyttö** - Pyörivä ilmoitusbanneri
- ⏰ **Ajastus** - Aseta vanhenemispäivät ilmoituksille
- 🌐 **Kaksikielinen** - Englanti ja suomi tuki

### 🎨 Käyttökokemus
- 🌓 **Tumma Tila** - Täysi tumma teema tuki
- 📱 **Mobiiliresponsiivinen** - Optimoitu kaikille laitteille
- ⚡ **Sulava Animaatio** - Ammattimaiset siirtymät ja efektit
- 🎯 **Intuitiivinen UI** - Puhdas, moderni käyttöliittymä
- 🔍 **Älykäs Haku** - Nopea huone- ja henkilöstöhaku

## 🚀 Pika-aloitus

### Paikallinen Käyttö:
```bash
npm install
npm run dev
```
Avaa: `http://localhost:5173`

### Julkinen URL (Cloudflare):
```bash
cloudflared tunnel --url http://localhost:3000
```
Jaa URL muille!

## 📚 Ohjeet

### Aloittelijalle:
- **NOPEA-OHJE.md** - 5 minuutin setup
- **CHANGELOG.md** - Versiohistoria ja päivitykset

### 24/7 Käyttö:
- **24-7-KAYNTI-OHJE.md** - Pidä sovellus päällä 24/7

### Oma URL:
- **KSYKMAPS-URL-OHJE.md** - Hanki "ksykmaps" URL

### Tekninen:
- **DEPLOYMENT.md** - Yksityiskohtaiset deployment ohjeet
- **CLOUDFLARE-SETUP.md** - Cloudflare Tunnel setup

## 🎯 Suositellut Vaihtoehdot

### Helpoin (5 min):
**Vercel** - Ilmainen, nopea, automaattinen 24/7
- URL: `ksykmaps.vercel.app`
- Katso: `NOPEA-OHJE.md`

### Paras Pitkälle Aikavälille:
**Cloudflare Tunnel + Oma Domain**
- URL: `ksykmaps.fi` (tai mikä tahansa)
- Katso: `KSYKMAPS-URL-OHJE.md`

### Täysi Kontrolli:
**Railway** - Sisältää tietokannan
- URL: `ksykmaps.up.railway.app`
- Hinta: 5€/kk (5€ ilmainen krediitti)

## 🔑 Admin Kirjautuminen

Admin paneeli on saatavilla osoitteessa `/admin-login`. Ota yhteyttä järjestelmän ylläpitäjään kirjautumistietojen saamiseksi.

**Turvallisuushuomautus:** Admin-tunnukset tallennetaan turvallisesti ympäristömuuttujiin eivätkä ne sisälly repositorioon.

## 🏗️ KSYK Builder

Admin paneelissa:
1. Mene **🏗️ KSYK Builder** välilehteen
2. Valitse tila:
   - **Custom Shapes** - Piirrä mukautettuja rakennuksia
   - **Buildings** - Hallinnoi rakennuksia
   - **Rooms** - Luo huoneita
3. Näe muutokset live kartalla!

## 📱 Jakaminen

Kun sovellus on käynnissä, jaa:
- **Pääsivu**: `https://sinun-url.com`
- **Admin**: `https://sinun-url.com/admin-login`

## 🛠️ Teknologiat

**Frontend:**
- ⚛️ React 18 + TypeScript
- 🎨 Tailwind CSS
- ⚡ Vite
- 🔄 React Query
- 🌐 i18next

**Backend:**
- 🚀 Express.js + Node.js
- 🔥 Firebase Firestore
- 🔐 Passport.js Autentikointi
- 📧 Nodemailer

**Deployment:**
- ☁️ Vercel
- 🌐 Cloudflare Tunnel

## 📦 Rakenne

```
KSYK-Map/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Komponentit
│   │   ├── pages/       # Sivut
│   │   └── lib/         # Utilities
├── server/              # Express backend
│   ├── routes.ts        # API routes
│   └── storage.ts       # Database
├── shared/              # Jaettu koodi
└── docs/                # Dokumentaatio
```

## 🔧 Environment Variables

Luo `.env` tiedosto:
```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_PROJECT_ID=your_project
DATABASE_URL=your_database
SESSION_SECRET=random_secret
OWNER_EMAIL=admin@example.com
OWNER_PASSWORD=secure_password
```

## 📋 Versiohistoria

Katso **`CHANGELOG.md`** yksityiskohtainen versiohistoria ja päivitykset.

**Nykyinen Versio:** 2.0.1 (24. tammikuuta 2026)

### Viimeisimmät Päivitykset:
- ✅ Henkilöstöhallintajärjestelmä täysin toimiva CRUD-toiminnoilla
- ✅ Versiotietopainike näyttää nykyisen version ja muutoslokin
- ✅ Mobiiliresponsiivisuuden parannukset
- ✅ Google Maps -tyylinen navigointi animoiduilla poluilla
- ✅ Parannettu 3D rakennusten renderöinti
- ✅ Korjattu sivupalkin vaihto ja mobiiliresponsiivisuus

## 🔮 Tulevat Ominaisuudet

- 🗓️ Tapahtumakalenteri huonevarauksilla
- 📊 Analytiikka dashboard
- 🔔 Push-ilmoitukset
- 🎫 QR-koodin integraatio
- 🌍 3D karttanäkymä

## 🆘 Tuki

### Ongelmat?
1. Tarkista `.env` tiedosto
2. Katso `24-7-KAYNTI-OHJE.md`
3. Tarkista Firebase console
4. Katso browser console virheet

### Kysymyksiä?
- 📧 Sähköposti: juuso.kaikula@ksyk.fi
- 💬 Discord: https://discord.gg/5ERZp9gUpr
- 🏫 Koulu: Kulosaaren Yhteiskoulu (KSYK)
- ⏱️ Vastausaika: Yleensä 24 tunnin sisällä
- 💬 Mainitse versionumero (v2.0.1) ongelmia raportoidessa

## 📄 Lisenssi

MIT License - Vapaa käyttöön!

## 🎉 Kiitokset

Tehty ❤️:llä OWL Apps toimesta KSYK:lle

---

## 🚀 Seuraavat Askeleet

1. ✅ Lue `NOPEA-OHJE.md`
2. ✅ Deploy Verceliin
3. ✅ Hanki oma URL
4. ✅ Jaa muille!

**Onnea! 🎊**
