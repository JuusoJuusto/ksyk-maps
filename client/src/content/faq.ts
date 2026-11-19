/** FAQ copy — shared by the /faq page and the build-time prerender (scripts/prerender.ts). */

export interface Q { q: string; a: string; qEn?: string; aEn?: string; }

export const QUESTIONS: Q[] = [
  {
    q: "Miten yhdistän Wilman lukujärjestykseeni?",
    a: "Avaa mobiilisovelluksesta Asetukset → Tili → 'Yhdistä Wilma-kalenteri'. Kopioi Wilman iCal-osoite Omat asetukset → Kalenteri → 'Kalenterien tilausosoitteet' ja liitä se sovellukseen. Tunnit ilmestyvät Lukujärjestys-välilehdelle automaattisesti.",
    qEn: "How do I connect my Wilma timetable?",
    aEn: "Open Mobile app → Settings → Account → 'Connect Wilma calendar'. Copy your Wilma iCal URL from Wilma → My settings → Calendar → 'Calendar subscription URLs' and paste it into the app. Lessons appear on the Timetable tab automatically.",
  },
  {
    q: "En saa push-ilmoituksia. Miksi?",
    a: "1) Varmista että asensit uusimman APK:n. 2) Anna sovellukselle ilmoituslupa: Asetukset → Sovellukset → KSYK Maps → Ilmoitukset. 3) Avaa sovellus vähintään kerran netin kanssa — laite rekisteröityy vasta silloin.",
    qEn: "I don't get push notifications. Why?",
    aEn: "1) Make sure you installed the latest APK. 2) Grant notification permission: Settings → Apps → KSYK Maps → Notifications. 3) Open the app at least once while online — the device only registers after that.",
  },
  {
    q: "Miten lisään widgetin kotinäytölle?",
    a: "Paina kotinäyttöä pitkään → 'Widgetit' → selaa alas 'KSYK'-kohtaan. Valitse haluamasi (Päivän lukujärjestys / Seuraava tunti / Nyt tunnilla) ja vedä paikalleen. Voit muuttaa kokoa ja asetuksia painamalla widgetiä pitkään.",
    qEn: "How do I add a widget to my home screen?",
    aEn: "Long-press your home screen → 'Widgets' → scroll to 'KSYK'. Choose the one you want (Today's Schedule / Next Lesson / Current Lesson) and drag it into place. You can resize and reconfigure by long-pressing the widget.",
  },
  {
    q: "Kartta näyttää vanhoja huoneita — miksi?",
    a: "Sovellus tallentaa kartan levylle jotta se avautuu nopeasti offline-tilassa. Pakota päivitys: Asetukset → Tallennustila → 'Tyhjennä välimuisti'. Live-tiedot latautuvat seuraavalla avauksella.",
    qEn: "The map shows outdated rooms — why?",
    aEn: "The app caches map data on disk so it opens fast offline. Force refresh: Settings → Storage → 'Clear cache'. Live data reloads on the next open.",
  },
  {
    q: "Milloin muistutus lukujärjestyksestä tulee?",
    a: "Oletuksena 5 minuuttia ennen tuntia. Voit muuttaa aikaa 0–30 minuuttiin Asetukset → Ilmoitukset → 'Muistutuksen aika ennen tuntia' -liukusäätimestä.",
    qEn: "When does the lesson reminder fire?",
    aEn: "Default is 5 minutes before class. You can change it 0–30 minutes in Settings → Notifications → 'Reminder lead time before class' slider.",
  },
  {
    q: "Kuinka pyydän uutta huonetta tai virheenkorjausta?",
    a: "Sovelluksen sisällä: Asetukset → 'Anna palautetta' tai 'Ilmoita viasta'. Molemmat menevät suoraan hallintapaneeliin.",
    qEn: "How do I request a new room or report a bug?",
    aEn: "Inside the app: Settings → 'Give feedback' or 'Report a bug'. Both go straight to the admin panel.",
  },
  {
    q: "Voinko käyttää sovellusta ilman kirjautumista?",
    a: "Kyllä. Kartta, huonehaku, lounas ja HSL-aikataulut toimivat ilman tunnusta. Wilma-tunnukset tarvitaan vain kun haluat oman lukujärjestyksesi automaattisesti.",
    qEn: "Can I use the app without logging in?",
    aEn: "Yes. Map, room search, lunch, and HSL times all work without an account. You only need Wilma credentials if you want your own timetable auto-imported.",
  },
  {
    q: "Toimiiko sovellus ilman yhteyttä?",
    a: "Suurimmaksi osaksi kyllä. Kartta, luokkahuoneet, lukujärjestys ja viimeisin lounaslista avautuvat välimuistista. Reaaliaikaiset tiedot (uudet ilmoitukset, HSL-aikataulut) vaativat yhteyden.",
    qEn: "Does the app work offline?",
    aEn: "Mostly yes. The map, rooms, timetable, and the latest lunch menu all open from cache. Real-time data (new announcements, HSL times) requires a connection.",
  },
  {
    q: "Miten navigoin luokkaan?",
    a: "Napauta karttanäkymässä huonetta → napauta 'Navigoi'-painiketta infokortissa. Sovellus laskee reitin nykyisestä sijainnistasi. Voit myös navigoida suoraan lukujärjestyksestä napauttamalla tunnin korttia → 'Navigoi'.",
    qEn: "How do I navigate to a classroom?",
    aEn: "Tap a room on the map → tap the 'Navigate' button in the info card. The app calculates a route from your current location. You can also navigate directly from the timetable by tapping a lesson card → 'Navigate'.",
  },
  {
    q: "Mitä lukujärjestyksen värit tarkoittavat?",
    a: "Jokainen kurssi saa oman värin (opettajan asettama hallintapaneelista). Väri toistuu vasemmassa kylkipalkissa ja nyt/seuraavaksi-kortissa. Yliviivatut ja himmennetyt tunnit ovat jo loppuneet tänään.",
    qEn: "What do the timetable colors mean?",
    aEn: "Each course gets its own color (set by your admin in the Courses panel). The color repeats in the left accent rail and the now/next card. Crossed-out and faded lessons have already ended today.",
  },
];
