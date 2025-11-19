# ⚡ PIKAOPAS - Sähköpostin Käyttöönotto

## 🎯 Nopein Tapa (5 minuuttia)

### 1. Käytä Omaa Gmail-tiliasi

Sinulla on jo Gmail? Täydellinen! Käytä sitä.

### 2. Ota Käyttöön App Password

**Mene tähän:** https://myaccount.google.com/apppasswords

Jos linkki ei toimi:
1. Mene: https://myaccount.google.com/security
2. Etsi "2-Step Verification" ja ota käyttöön (jos ei ole jo)
3. Palaa takaisin ja etsi "App passwords"

**Luo salasana:**
1. Valitse "Other (Custom name)"
2. Kirjoita: `KSYK Map`
3. Klikkaa "Generate"
4. **KOPIOI salasana** (esim: `abcd efgh ijkl mnop`)

### 3. Muokkaa .env Tiedostoa

Avaa `.env` tiedosto ja lisää nämä rivit (poista # merkit):

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=sinun-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
```

**TÄRKEÄÄ:**
- Vaihda `sinun-email@gmail.com` omaan sähköpostiisi
- Vaihda `abcdefghijklmnop` kopioimaasi App Passwordiin
- **Poista välilyönnit** App Passwordista!

### 4. Käynnistä Palvelin Uudelleen

Pysäytä ja käynnistä palvelin uudelleen. Valmis! ✅

---

## 🧪 Testaa Heti

1. Kirjaudu sisään: `JuusoJuusto112@gmail.com` / `Juusto2012!`
2. Mene "Users" välilehdelle
3. Klikkaa "Add User"
4. Täytä tiedot ja valitse "Send email invitation"
5. Käytä **omaa sähköpostiosoitettasi** testikäyttäjänä
6. Klikkaa "Create User"
7. **Tarkista sähköpostisi!** 📧

---

## ❓ Kysymyksiä?

### Pitääkö minun luoda uusi sähköposti?
**EI!** Voit käyttää olemassa olevaa Gmail-tiliäsi. Se on helpoin ja nopein tapa.

### Onko tämä turvallista?
**KYLLÄ!** App Password on turvallinen tapa. Se toimii vain tässä sovelluksessa, ei anna pääsyä koko Gmail-tilillesi.

### Mitä jos en halua käyttää omaa sähköpostia?
Voit luoda uuden Gmail-tilin (esim: `ksykmap.admin@gmail.com`). Katso täydelliset ohjeet: `EMAIL_SETUP_OHJEET.md`

### Toimiiko ilman sähköpostia?
**KYLLÄ!** Jos et aseta sähköpostia, salasanat näytetään palvelimen konsolissa. Voit kopioida ne sieltä.

---

## 🎉 Valmis!

Kun olet lisännyt tiedot `.env` tiedostoon:
- ✅ Sähköpostit lähetetään automaattisesti
- ✅ Käyttäjät saavat kauniin viestin
- ✅ Viesti sisältää salasanan
- ✅ Kaikki toimii!

**Onnea käyttöön! 🚀**
