# 🗺️ KSYK Campus Maps

Interaktiivinen kampuskartta KSYK:lle. Luo mukautettuja rakennuksia, hallinnoi huoneita ja jaa kartta kaikille!

## ✨ Ominaisuudet

- 🏗️ **Mukautetut Rakennukset** - Klikkaa ja piirrä mitä tahansa muotoja
- 🎨 **Täysi Väripaletti** - Valitse mikä tahansa väri väripyörästä
- 🗺️ **Live Kartta** - Näe muutokset reaaliajassa
- 📢 **Ilmoitukset** - Julkaisu- ja vanhenemispäivät
- 👥 **Käyttäjähallinta** - Luo admin-käyttäjiä
- 📱 **Responsiivinen** - Toimii kaikilla laitteilla

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

- URL: `/admin-login`
- Email: `JuusoJuusto112@gmail.com`
- Salasana: `Juusto2012!`

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

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express + Node.js
- **Database**: Firebase / PostgreSQL
- **Styling**: Tailwind CSS
- **Maps**: Custom SVG
- **Hosting**: Vercel / Railway / Cloudflare

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
```

## 🆘 Tuki

### Ongelmat?
1. Tarkista `.env` tiedosto
2. Katso `24-7-KAYNTI-OHJE.md`
3. Tarkista Firebase console
4. Katso browser console virheet

### Kysymyksiä?
- Katso ohjeet `docs/` kansiosta
- Tarkista GitHub Issues
- Lue `DEPLOYMENT.md`

## 📄 Lisenssi

MIT License - Vapaa käyttöön!

## 🎉 Kiitokset

Tehty ❤️:llä KSYK:lle

---

## 🚀 Seuraavat Askeleet

1. ✅ Lue `NOPEA-OHJE.md`
2. ✅ Deploy Verceliin
3. ✅ Hanki oma URL
4. ✅ Jaa muille!

**Onnea! 🎊**
