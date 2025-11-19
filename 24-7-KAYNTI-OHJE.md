# ⚡ KSYK Maps - 24/7 Käynnissä Pito Ohje

## 🎯 Vaihtoehdot 24/7 Käynnille

### Vaihtoehto 1: Vercel/Railway (HELPOIN)
**Hinta:** Ilmainen / 5€/kk
**Vaikeus:** ⭐ Helppo
**Suositus:** ⭐⭐⭐⭐⭐

### Vaihtoehto 2: Windows Service
**Hinta:** Ilmainen (oma kone)
**Vaikeus:** ⭐⭐ Keskivaikea
**Suositus:** ⭐⭐⭐

### Vaihtoehto 3: Task Scheduler
**Hinta:** Ilmainen (oma kone)
**Vaikeus:** ⭐ Helppo
**Suositus:** ⭐⭐⭐⭐

---

## 🚀 HELPOIN: Vercel (5 minuuttia)

### Miksi Vercel?
- ✅ Täysin automaattinen
- ✅ Ei tarvitse pitää konetta päällä
- ✅ Ilmainen
- ✅ Nopea (CDN)
- ✅ Automaattiset päivitykset GitHubista

### Asennusohjeet:

#### 1. Luo GitHub Repository
```bash
# Projektin kansiossa
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SINUN-KÄYTTÄJÄ/ksyk-maps.git
git push -u origin main
```

#### 2. Deploy Verceliin
1. Mene: https://vercel.com
2. Kirjaudu GitHub-tilillä
3. Klikkaa "New Project"
4. Valitse `ksyk-maps` repository
5. Klikkaa "Deploy"

#### 3. Lisää Environment Variables
1. Mene Settings → Environment Variables
2. Lisää kaikki `.env` muuttujat:
   ```
   VITE_FIREBASE_API_KEY=sinun_avain
   VITE_FIREBASE_AUTH_DOMAIN=sinun_domain
   VITE_FIREBASE_PROJECT_ID=sinun_projekti
   VITE_FIREBASE_STORAGE_BUCKET=sinun_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=sinun_id
   VITE_FIREBASE_APP_ID=sinun_app_id
   DATABASE_URL=sinun_tietokanta_url
   SESSION_SECRET=satunnainen_salaisuus
   ```

#### 4. Redeploy
1. Mene Deployments
2. Klikkaa "Redeploy"

**VALMIS! Sovellus pyörii nyt 24/7 automaattisesti!**

URL: `https://ksykmaps.vercel.app`

---

## 💻 OMALLA KONEELLA: Windows Service

### Miksi Windows Service?
- ✅ Käynnistyy automaattisesti koneen käynnistyessä
- ✅ Pyörii taustalla
- ✅ Ei tarvitse pitää terminaalia auki
- ❌ Kone pitää olla päällä 24/7

### Asennusohjeet:

#### 1. Asenna PM2 (Process Manager)
```bash
npm install -g pm2
npm install -g pm2-windows-service
```

#### 2. Luo PM2 Ecosystem File
Luo tiedosto: `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'ksyk-maps',
    script: 'npm',
    args: 'start',
    cwd: 'C:\\Users\\JuusoKaikula\\Downloads\\KSYK-Map',
    env: {
      NODE_ENV: 'production'
    },
    watch: false,
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

#### 3. Käynnistä PM2
```bash
# Käynnistä sovellus
pm2 start ecosystem.config.js

# Tallenna PM2 lista
pm2 save

# Asenna Windows Service
pm2-service-install
```

#### 4. Asenna Cloudflare Service
Luo tiedosto: `C:\cloudflared\config.yml`

```yaml
tunnel: ksykmaps
credentials-file: C:\Users\JuusoKaikula\.cloudflared\TUNNEL-ID.json

ingress:
  - hostname: ksykmaps.sinundomain.fi
    service: http://localhost:3000
  - service: http_status:404
```

Asenna service:
```bash
cloudflared service install
```

**VALMIS! Molemmat käynnistyvät automaattisesti!**

---

## 📅 HELPPO: Task Scheduler

### Miksi Task Scheduler?
- ✅ Sisäänrakennettu Windowsiin
- ✅ Helppo käyttää
- ✅ Käynnistyy automaattisesti
- ❌ Kone pitää olla päällä

### Asennusohjeet:

#### 1. Luo Käynnistysscripti
Luo tiedosto: `start-ksyk-maps.bat`

```batch
@echo off
cd C:\Users\JuusoKaikula\Downloads\KSYK-Map
start "KSYK Maps" cmd /k npm start
timeout /t 10
start "Cloudflare Tunnel" cmd /k cloudflared tunnel run ksykmaps
```

#### 2. Avaa Task Scheduler
1. Paina `Win + R`
2. Kirjoita: `taskschd.msc`
3. Paina Enter

#### 3. Luo Uusi Task
1. Klikkaa "Create Basic Task"
2. Nimi: `KSYK Maps 24/7`
3. Trigger: "When the computer starts"
4. Action: "Start a program"
5. Program: `C:\Users\JuusoKaikula\Downloads\KSYK-Map\start-ksyk-maps.bat`
6. Valitse "Open Properties"

#### 4. Konfiguroi Task
1. General-välilehti:
   - ✅ "Run whether user is logged on or not"
   - ✅ "Run with highest privileges"
2. Triggers-välilehti:
   - ✅ "Enabled"
3. Settings-välilehti:
   - ✅ "Allow task to be run on demand"
   - ✅ "If task fails, restart every: 1 minute"

**VALMIS! Käynnistyy automaattisesti koneen käynnistyessä!**

---

## 🔄 Railway (Automaattinen 24/7)

### Miksi Railway?
- ✅ Sisältää tietokannan
- ✅ Automaattinen 24/7
- ✅ 5€/kk ilmainen krediitti
- ✅ Helppo käyttää

### Asennusohjeet:

#### 1. Luo Railway Tili
1. Mene: https://railway.app
2. Kirjaudu GitHub-tilillä

#### 2. Deploy Projekti
1. Klikkaa "New Project"
2. Valitse "Deploy from GitHub repo"
3. Valitse `ksyk-maps`
4. Railway deployaa automaattisesti

#### 3. Lisää PostgreSQL
1. Klikkaa "New"
2. Valitse "Database"
3. Valitse "PostgreSQL"
4. Railway yhdistää automaattisesti

#### 4. Lisää Environment Variables
1. Klikkaa projektia
2. Mene "Variables"
3. Lisää Firebase credentials

**VALMIS! Pyörii 24/7 automaattisesti!**

URL: `https://ksykmaps.up.railway.app`

---

## 📊 Vertailu

| Vaihtoehto | Hinta | Vaikeus | Luotettavuus | Nopeus |
|------------|-------|---------|--------------|--------|
| Vercel | Ilmainen | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Railway | 5€/kk | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Windows Service | Ilmainen* | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Task Scheduler | Ilmainen* | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

*Vaatii koneen olevan päällä 24/7 (sähkölasku ~5-10€/kk)

---

## 🎯 Suositus

### Jos Et Halua Pitää Konetta Päällä:
→ **Vercel** (Ilmainen, helppo, nopea)

### Jos Tarvitset Tietokannan:
→ **Railway** (5€/kk, sisältää kaiken)

### Jos Haluat Käyttää Omaa Konetta:
→ **Task Scheduler** (Helpoin omalla koneella)

---

## 🔧 Ylläpito

### Vercel/Railway:
- Ei tarvitse tehdä mitään!
- Päivittyy automaattisesti GitHubista

### Windows Service/Task Scheduler:
```bash
# Tarkista status
pm2 status

# Käynnistä uudelleen
pm2 restart ksyk-maps

# Katso logit
pm2 logs ksyk-maps

# Pysäytä
pm2 stop ksyk-maps
```

---

## 🆘 Ongelmatilanteet

### "Sovellus ei käynnisty"
```bash
# Tarkista PM2
pm2 logs ksyk-maps

# Käynnistä uudelleen
pm2 restart ksyk-maps
```

### "Cloudflare tunnel ei toimi"
```bash
# Tarkista status
cloudflared tunnel info ksykmaps

# Käynnistä uudelleen
cloudflared service uninstall
cloudflared service install
```

### "Vercel deployment epäonnistui"
1. Tarkista Environment Variables
2. Tarkista build logs
3. Redeploy

---

## 💡 Vinkit

### Sähkölaskun Säästö (Oma Kone):
1. Käytä kannettavaa (kuluttaa vähemmän)
2. Sammuta näyttö
3. Käytä virransäästötilaa
4. Harkitse Vercel/Railway:ta

### Varmuuskopiointi:
```bash
# Backup Firebase data
# Mene Firebase Console → Firestore → Export

# Backup koodi
git push origin main
```

### Monitorointi:
- Vercel: Sisäänrakennettu analytics
- Railway: Sisäänrakennettu metrics
- Oma kone: PM2 dashboard

---

## 📝 Checklist

- [ ] Valitse vaihtoehto (suositus: Vercel)
- [ ] Seuraa ohjeita
- [ ] Testaa että toimii
- [ ] Aseta varmuuskopiot
- [ ] Jaa URL muille!

**Onnea 24/7 käyttöön! 🚀**
