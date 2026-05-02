import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, Send, HelpCircle, Book, Calendar, 
  Mail, User, Settings, ExternalLink, ChevronRight,
  Clock, CheckCircle, AlertCircle, FileText
} from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'owl';
  timestamp: Date;
  quickActions?: QuickAction[];
}

interface QuickAction {
  label: string;
  action: string;
  icon?: React.ReactNode;
}

/**
 * Smart Support Owl (Tuki Pöllö)
 * Rule-based intelligent support system - NO AI
 * Finnish language support with quick actions
 */
export default function SmartSupportOwl() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hei! Olen Tuki Pöllö 🦉 Kuinka voin auttaa sinua tänään?',
      sender: 'owl',
      timestamp: new Date(),
      quickActions: [
        { label: 'Salasanan vaihto', action: 'password', icon: <Settings className="w-4 h-4" /> },
        { label: 'Lukujärjestys', action: 'schedule', icon: <Calendar className="w-4 h-4" /> },
        { label: 'Arvosanat', action: 'grades', icon: <FileText className="w-4 h-4" /> },
        { label: 'Viestit', action: 'messages', icon: <Mail className="w-4 h-4" /> },
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Knowledge base - Rule-based responses (NO AI)
  const knowledgeBase = {
    // Greetings - MASSIVELY EXPANDED
    tervehdys: {
      keywords: [
        // Basic greetings
        'hei', 'moi', 'moikka', 'terve', 'moro', 'heippa', 'morjens', 'moikku', 'moikka moi',
        // Time-based
        'päivää', 'huomenta', 'iltaa', 'yötä', 'hyvää päivää', 'hyvää huomenta', 'hyvää iltaa',
        // Casual variations
        'moro', 'moroo', 'moromoi', 'heihei', 'hei hei', 'heips', 'heipsan', 'heipparallaa',
        'terve terve', 'terveppä terve', 'tere', 'tereh', 'terveiset',
        // Slang
        'joo', 'jep', 'jeejee', 'jees', 'yo', 'sup', 'mitä kuuluu', 'miten menee',
        // English
        'hello', 'hi', 'hey', 'hola', 'howdy', 'greetings',
        // Questions
        'onko täällä ketään', 'hei siellä', 'kuuluuko', 'oletko siellä'
      ],
      response: 'Hei! 🦉 Mukava nähdä sinua! Olen Tuki Pöllö ja olen täällä auttamassa sinua.\n\nVoin auttaa sinua monissa asioissa:\n• Salasanojen vaihto\n• Lukujärjestykset\n• Arvosanat\n• Viestit\n• Poissaolot\n• Tekniset ongelmat\n\nMitä haluat tehdä?',
      quickActions: [
        { label: 'Salasana', action: 'password', icon: <Settings className="w-4 h-4" /> },
        { label: 'Lukujärjestys', action: 'schedule', icon: <Calendar className="w-4 h-4" /> },
        { label: 'Arvosanat', action: 'grades', icon: <FileText className="w-4 h-4" /> },
        { label: 'Viestit', action: 'messages', icon: <Mail className="w-4 h-4" /> },
      ]
    },
    
    // Thanks - EXPANDED
    kiitos: {
      keywords: [
        'kiitos', 'kiitti', 'kiitoksia', 'kiitän', 'kiitti paljon', 'kiitos paljon',
        'thanks', 'thank you', 'thx', 'ty', 'thank u', 'thnx', 'thanx',
        'kiitti vaan', 'kiitos vaan', 'kiitti siitä', 'kiitos siitä',
        'paljon kiitoksia', 'suuret kiitokset', 'kiitos avusta',
        'auttoi', 'auttoi paljon', 'hyvä', 'loistava', 'mahtava', 'täydellinen'
      ],
      response: 'Ole hyvä! 🦉 Olen aina täällä auttamassa sinua. Jos tarvitset lisää apua, kysy vain!',
      quickActions: [
        { label: 'Takaisin alkuun', action: 'default', icon: <HelpCircle className="w-4 h-4" /> },
      ]
    },
    
    // Goodbye - EXPANDED
    näkemiin: {
      keywords: [
        'näkemiin', 'nähdään', 'näkee', 'näkemisiin',
        'hei hei', 'heihei', 'moi moi', 'moimoi', 'moikka moi',
        'heippa', 'heippahei', 'heipparallaa',
        'bye', 'goodbye', 'cya', 'see you', 'see ya', 'later', 'bye bye',
        'lähen', 'lähen nyt', 'meen', 'meen nyt', 'poistun',
        'kiitti ja moi', 'kiitos ja näkemiin', 'ok moi', 'okei moi'
      ],
      response: 'Näkemiin! 🦉 Toivottavasti sain autettua sinua. Tervetuloa takaisin milloin vain!',
      quickActions: []
    },
    
    // How are you - EXPANDED
    kuuluminen: {
      keywords: [
        'mitä kuuluu', 'mitäs kuuluu', 'mitä sulle kuuluu',
        'miten menee', 'miten sulla menee', 'miten voit', 'kuinka voit',
        'how are you', 'how r u', 'how are u', 'whats up', 'what\'s up',
        'miten hurisee', 'miten sujuu', 'miten elämä', 'miten päivä',
        'onko kaikki hyvin', 'voitko hyvin', 'kaikki ok', 'kaikki okei'
      ],
      response: 'Kiitos kysymästä! 🦉 Minulla menee hyvin, olen valmis auttamaan sinua!\n\nEntä sinulle - voinko auttaa jossain asiassa?',
      quickActions: [
        { label: 'Kyllä, tarvitsen apua', action: 'default', icon: <HelpCircle className="w-4 h-4" /> },
      ]
    },
    
    // Help
    apu: {
      keywords: ['apu', 'apua', 'help', 'neuvoa', 'ohje', 'ohjeet', 'opastus'],
      response: 'Totta kai autan! 🦉 Kerro minulle, missä tarvitset apua:\n\n• Salasanan vaihto tai palautus\n• Lukujärjestyksen katselu\n• Arvosanojen tarkistus\n• Viestien lähettäminen\n• Poissaolojen ilmoittaminen\n• Tekniset ongelmat\n\nValitse aihe tai kirjoita kysymyksesi!',
      quickActions: [
        { label: 'Salasana', action: 'password', icon: <Settings className="w-4 h-4" /> },
        { label: 'Lukujärjestys', action: 'schedule', icon: <Calendar className="w-4 h-4" /> },
        { label: 'Arvosanat', action: 'grades', icon: <FileText className="w-4 h-4" /> },
        { label: 'Viestit', action: 'messages', icon: <Mail className="w-4 h-4" /> },
      ]
    },
    
    // Password related
    salasana: {
      keywords: ['salasana', 'password', 'vaihda', 'unohdin', 'forgot', 'kirjaudu', 'login'],
      response: 'Voit vaihtaa salasanasi seuraavasti:\n\n1. Klikkaa "Asetukset" yläpalkista\n2. Valitse "Salasanan vaihto"\n3. Syötä vanha salasana\n4. Syötä uusi salasana kahdesti\n5. Klikkaa "Tallenna"\n\nJos olet unohtanut salasanasi, klikkaa "Unohdin salasanani" kirjautumissivulla.',
      quickActions: [
        { label: 'Avaa asetukset', action: 'open-settings', icon: <Settings className="w-4 h-4" /> },
        { label: 'Salasanan palautus', action: 'reset-password', icon: <HelpCircle className="w-4 h-4" /> },
      ]
    },
    
    // Schedule related
    lukujärjestys: {
      keywords: ['lukujärjestys', 'aikataulu', 'schedule', 'oppitunti', 'tunti'],
      response: 'Lukujärjestyksesi löydät seuraavasti:\n\n1. Siirry "Wilma" -välilehdelle\n2. Valitse "Lukujärjestys"\n3. Näet tämän viikon tunnit\n\nVoit myös:\n- Tulostaa lukujärjestyksen\n- Ladata sen PDF-muodossa\n- Jakaa sen huoltajille',
      quickActions: [
        { label: 'Avaa lukujärjestys', action: 'open-schedule', icon: <Calendar className="w-4 h-4" /> },
        { label: 'Lataa PDF', action: 'download-schedule', icon: <FileText className="w-4 h-4" /> },
      ]
    },
    
    // Grades related
    arvosanat: {
      keywords: ['arvosana', 'arvosanat', 'grade', 'numero', 'suoritus'],
      response: 'Arvosanasi löydät seuraavasti:\n\n1. Siirry "Wilma" -välilehdelle\n2. Valitse "Arvosanat"\n3. Näet kaikki arvosanasi\n\nArvosanat päivittyvät automaattisesti kun opettaja on merkinnyt ne järjestelmään.',
      quickActions: [
        { label: 'Avaa arvosanat', action: 'open-grades', icon: <FileText className="w-4 h-4" /> },
        { label: 'Tilastot', action: 'view-stats', icon: <CheckCircle className="w-4 h-4" /> },
      ]
    },
    
    // Messages related
    viestit: {
      keywords: ['viesti', 'viestit', 'message', 'sähköposti', 'email'],
      response: 'Viestit löydät seuraavasti:\n\n1. Siirry "Wilma" -välilehdelle\n2. Valitse "Viestit"\n3. Näet kaikki viestisi\n\nVoit lähettää viestin:\n1. Klikkaa "Uusi viesti"\n2. Valitse vastaanottaja\n3. Kirjoita viesti\n4. Klikkaa "Lähetä"',
      quickActions: [
        { label: 'Avaa viestit', action: 'open-messages', icon: <Mail className="w-4 h-4" /> },
        { label: 'Uusi viesti', action: 'new-message', icon: <Send className="w-4 h-4" /> },
      ]
    },
    
    // Attendance related
    poissaolo: {
      keywords: ['poissaolo', 'poissa', 'sairas', 'absence', 'tuntimerkintä'],
      response: 'Poissaolojen ilmoittaminen:\n\n1. Siirry "Wilma" -välilehdelle\n2. Valitse "Tuntimerkinnät"\n3. Klikkaa "Ilmoita poissaolo"\n4. Valitse päivämäärä ja syy\n5. Klikkaa "Tallenna"\n\nHuoltaja voi myös ilmoittaa poissaolon puolestasi.',
      quickActions: [
        { label: 'Ilmoita poissaolo', action: 'report-absence', icon: <AlertCircle className="w-4 h-4" /> },
        { label: 'Näytä tuntimerkinnät', action: 'view-attendance', icon: <CheckCircle className="w-4 h-4" /> },
      ]
    },
    
    // Technical issues
    tekninen: {
      keywords: ['ei toimi', 'virhe', 'error', 'bug', 'ongelma', 'tekninen', 'rikki', 'broken', 'crash', 'jumissa'],
      response: 'Teknisen ongelman ratkaiseminen:\n\n1. Päivitä sivu (F5 tai Ctrl+R)\n2. Tyhjennä selaimen välimuisti\n3. Kokeile toista selainta\n4. Tarkista internet-yhteys\n\nJos ongelma jatkuu, ota yhteyttä tukeen.',
      quickActions: [
        { label: 'Päivitä sivu', action: 'refresh', icon: <HelpCircle className="w-4 h-4" /> },
        { label: 'Ota yhteyttä tukeen', action: 'contact-support', icon: <Mail className="w-4 h-4" /> },
      ]
    },
    
    // Homework
    kotitehtävät: {
      keywords: ['kotitehtävä', 'kotitehtävät', 'läksy', 'läksyt', 'homework', 'tehtävä', 'tehtävät'],
      response: 'Kotitehtävät löydät seuraavasti:\n\n1. Siirry "Wilma" -välilehdelle\n2. Valitse "Kotitehtävät"\n3. Näet kaikki tehtäväsi\n\nVoit myös:\n- Merkitä tehtävät tehdyiksi\n- Ladata liitteitä\n- Palauttaa tehtäviä',
      quickActions: [
        { label: 'Avaa kotitehtävät', action: 'open-homework', icon: <FileText className="w-4 h-4" /> },
      ]
    },
    
    // Exams
    kokeet: {
      keywords: ['koe', 'kokeet', 'tentti', 'tentit', 'exam', 'test', 'testi'],
      response: 'Kokeet ja tentit löydät seuraavasti:\n\n1. Siirry "Wilma" -välilehdelle\n2. Valitse "Kokeet"\n3. Näet tulevat kokeet\n\nKokeista näet:\n- Päivämäärän ja ajan\n- Aiheet\n- Luokan\n- Opettajan',
      quickActions: [
        { label: 'Avaa kokeet', action: 'open-exams', icon: <Calendar className="w-4 h-4" /> },
      ]
    },
    
    // Lunch menu
    ruoka: {
      keywords: ['ruoka', 'lounas', 'ruokalista', 'menu', 'lunch', 'syöminen', 'ruokala'],
      response: 'Ruokalistan näet seuraavasti:\n\n1. Klikkaa "Lounaslista" yläpalkista\n2. Näet tämän viikon ruokalistan\n\nRuokalistassa näkyy:\n- Päivän lounas\n- Allergeenit\n- Kasvisvaihtoehto',
      quickActions: [
        { label: 'Avaa ruokalista', action: 'open-lunch', icon: <Calendar className="w-4 h-4" /> },
      ]
    },
    
    // Map
    kartta: {
      keywords: ['kartta', 'map', 'kampus', 'campus', 'missä', 'where', 'sijainti', 'location', 'luokka', 'classroom'],
      response: 'Kampuskartan löydät seuraavasti:\n\n1. Klikkaa "Kartta" yläpalkista\n2. Näet koko kampuksen kartan\n\nKartasta voit:\n- Etsiä luokkia\n- Nähdä rakennukset\n- Suunnitella reittejä',
      quickActions: [
        { label: 'Avaa kartta', action: 'open-map', icon: <Calendar className="w-4 h-4" /> },
      ]
    },
    
    // Who are you - EXPANDED
    kuka: {
      keywords: [
        'kuka olet', 'mikä olet', 'kuka sinä olet', 'mikä sinä olet',
        'who are you', 'what are you', 'who r u',
        'kerro itsestäsi', 'kerro itsestäs', 'esittele itsesi', 'esittäydy',
        'mikä on nimesi', 'mikä sun nimi on', 'what is your name',
        'mitä sä oot', 'mitä sä teet', 'mikä tää on'
      ],
      response: 'Olen Tuki Pöllö! 🦉\n\nOlen KSYK Mapsin älykäs tukijärjestelmä. Käytän sääntöpohjaista logiikkaa (ei tekoälyä) auttaakseni sinua kaikissa Wilma-järjestelmään liittyvissä asioissa.\n\nOlen täällä 24/7 vastaamassa kysymyksiisi ja auttamassa sinua!',
      quickActions: [
        { label: 'Mitä osaat tehdä?', action: 'default', icon: <HelpCircle className="w-4 h-4" /> },
      ]
    },
    
    // Casual conversation - NEW
    jutustelu: {
      keywords: [
        'tylsää', 'tylsä', 'ikävä', 'pitkästyttää',
        'hauskaa', 'hauska', 'vitsi', 'kerro vitsi', 'naurattaa',
        'cool', 'siisti', 'kiva', 'jees', 'nice',
        'ok', 'okei', 'okay', 'selvä', 'joo', 'jep', 'yep', 'yes',
        'ei', 'en', 'en halua', 'ei kiitos', 'no', 'nope',
        'hmm', 'öö', 'ööö', 'hmmmm', 'no niin'
      ],
      response: 'Ymmärrän! 🦉 Jos tarvitset apua jossain asiassa, olen täällä. Voin auttaa sinua:\n\n• Salasanojen kanssa\n• Lukujärjestyksen katsomisessa\n• Arvosanojen tarkistamisessa\n• Viestien lähettämisessä\n• Ja monessa muussa!\n\nKysypä vain!',
      quickActions: [
        { label: 'Näytä mitä osaat', action: 'default', icon: <HelpCircle className="w-4 h-4" /> },
      ]
    },
    
    // Compliments - NEW
    kehu: {
      keywords: [
        'hyvä', 'loistava', 'mahtava', 'upea', 'hieno', 'kiva',
        'great', 'awesome', 'amazing', 'fantastic', 'wonderful',
        'olet hyvä', 'olet paras', 'paras', 'tosi hyvä',
        'toimii hyvin', 'toimii', 'hyvä homma'
      ],
      response: 'Kiitos! 🦉 Olen iloinen että voin auttaa sinua! Se on minun tehtäväni.\n\nJos tarvitset lisää apua, olen aina täällä!',
      quickActions: [
        { label: 'Takaisin alkuun', action: 'default', icon: <HelpCircle className="w-4 h-4" /> },
      ]
    },
    
    // Complaints - NEW
    valitus: {
      keywords: [
        'huono', 'paska', 'ei toimi', 'ei auta', 'turha',
        'bad', 'sucks', 'useless', 'stupid', 'dumb',
        'en ymmärrä', 'en tajua', 'hämmentävä', 'vaikea',
        'liian vaikea', 'liian monimutkainen'
      ],
      response: 'Pahoittelut! 🦉 Yritän parhaani auttaakseni sinua.\n\nKerro tarkemmin mikä ongelma sinulla on, niin yritän auttaa paremmin:\n\n• Salasana-ongelmat?\n• Lukujärjestys-kysymykset?\n• Arvosana-asiat?\n• Viesti-ongelmat?\n• Jotain muuta?\n\nKerro minulle!',
      quickActions: [
        { label: 'Ota yhteyttä tukeen', action: 'contact-support', icon: <Mail className="w-4 h-4" /> },
        { label: 'Näytä ohjeet', action: 'default', icon: <HelpCircle className="w-4 h-4" /> },
      ]
    },
    
    // Subject-specific help - NEW
    aineet: {
      keywords: [
        'matematiikka', 'matikka', 'math', 'laskut', 'laskeminen',
        'fysiikka', 'physics', 'kemia', 'chemistry',
        'englanti', 'english', 'ruotsi', 'swedish', 'saksa', 'german',
        'historia', 'history', 'maantieto', 'geography',
        'biologia', 'biology', 'terveystieto', 'health',
        'liikunta', 'pe', 'physical education', 'urheilu',
        'musiikki', 'music', 'kuvataide', 'art',
        'käsityö', 'crafts', 'kotitalous', 'home economics'
      ],
      response: 'Ainekohtainen apu! 🦉\n\nVoin auttaa sinua löytämään:\n\n• Aineen lukujärjestyksen\n• Aineen arvosanat\n• Aineen kotitehtävät\n• Aineen kokeet\n• Aineen opettajan yhteystiedot\n\nMitä haluat tietää?',
      quickActions: [
        { label: 'Lukujärjestys', action: 'schedule', icon: <Calendar className="w-4 h-4" /> },
        { label: 'Arvosanat', action: 'grades', icon: <FileText className="w-4 h-4" /> },
        { label: 'Kotitehtävät', action: 'open-homework', icon: <FileText className="w-4 h-4" /> },
        { label: 'Kokeet', action: 'open-exams', icon: <Calendar className="w-4 h-4" /> },
      ]
    },
    
    // Parent-related - NEW
    huoltaja: {
      keywords: [
        'vanhempi', 'vanhemmat', 'äiti', 'isä', 'huoltaja', 'huoltajat',
        'parent', 'parents', 'mom', 'dad', 'mother', 'father',
        'vanhempainilta', 'vanhempainvartti', 'parent meeting',
        'huoltajan viesti', 'vanhemman viesti'
      ],
      response: 'Huoltaja-asiat! 🦉\n\nHuoltajat voivat:\n\n• Nähdä opiskelijan tiedot\n• Lukea viestit\n• Ilmoittaa poissaolot\n• Seurata arvosanoja\n• Katsella lukujärjestystä\n\nHuoltajat kirjautuvat omilla tunnuksillaan Wilmaan.',
      quickActions: [
        { label: 'Huoltajan ohjeet', action: 'parent-guide', icon: <User className="w-4 h-4" /> },
        { label: 'Viestit', action: 'messages', icon: <Mail className="w-4 h-4" /> },
      ]
    },
    
    // Account issues - NEW
    tili: {
      keywords: [
        'tili', 'account', 'käyttäjätunnus', 'username',
        'en pääse sisään', 'en voi kirjautua', 'can\'t login', 'cannot login',
        'lukittu', 'locked', 'estetty', 'blocked',
        'unohdin käyttäjätunnuksen', 'forgot username'
      ],
      response: 'Tili-ongelmat! 🦉\n\nJos et pääse kirjautumaan:\n\n1. Tarkista käyttäjätunnus (yleensä sähköpostiosoite)\n2. Tarkista salasana (huomioi isot/pienet kirjaimet)\n3. Kokeile salasanan palautusta\n4. Ota yhteyttä tukeen jos ongelma jatkuu\n\nKäyttäjätunnuksesi on yleensä: etunimi.sukunimi@ksyk.fi',
      quickActions: [
        { label: 'Salasanan palautus', action: 'reset-password', icon: <Settings className="w-4 h-4" /> },
        { label: 'Ota yhteyttä tukeen', action: 'contact-support', icon: <Mail className="w-4 h-4" /> },
      ]
    },
    
    // Mobile app - NEW
    mobiili: {
      keywords: [
        'mobiili', 'mobile', 'puhelin', 'phone', 'älypuhelin', 'smartphone',
        'android', 'iphone', 'ios', 'app', 'sovellus', 'applikaatio',
        'lataa', 'download', 'asennus', 'install'
      ],
      response: 'Mobiilisovellus! 🦉\n\nKSYK Maps toimii myös mobiililaitteilla:\n\n• Avaa selaimella: ksykmaps.vercel.app\n• Lisää kotinäytölle (PWA)\n• Toimii Androidilla ja iOS:llä\n• Ei erillistä sovellusta tarvita\n\nMobiiliversio on optimoitu pienille näytöille!',
      quickActions: [
        { label: 'Ohjeet PWA:han', action: 'pwa-guide', icon: <HelpCircle className="w-4 h-4" /> },
      ]
    },
    
    // Notifications - NEW
    ilmoitukset: {
      keywords: [
        'ilmoitus', 'ilmoitukset', 'notification', 'notifications',
        'hälytys', 'hälytykset', 'alert', 'alerts',
        'muistutus', 'muistutukset', 'reminder', 'reminders',
        'ei tule ilmoituksia', 'no notifications'
      ],
      response: 'Ilmoitukset! 🦉\n\nVoit hallita ilmoituksia:\n\n1. Siirry "Asetukset"\n2. Valitse "Ilmoitukset"\n3. Valitse mitä ilmoituksia haluat\n\nVoit saada ilmoituksia:\n• Uusista viesteistä\n• Uusista arvosanoista\n• Tulevista kokeista\n• Kotitehtävistä',
      quickActions: [
        { label: 'Avaa asetukset', action: 'open-settings', icon: <Settings className="w-4 h-4" /> },
      ]
    },
    
    // Privacy - NEW
    yksityisyys: {
      keywords: [
        'yksityisyys', 'privacy', 'tietosuoja', 'data protection',
        'gdpr', 'henkilötiedot', 'personal data',
        'tietojen käsittely', 'data processing',
        'kuka näkee tietoni', 'who sees my data'
      ],
      response: 'Yksityisyys ja tietosuoja! 🦉\n\nTietosi ovat turvassa:\n\n• Tiedot salataan\n• Vain sinä ja opettajat näkevät tietosi\n• Huoltajat näkevät vain lapsensa tiedot\n• Noudatamme GDPR-säädöksiä\n• Tietoja ei jaeta kolmansille osapuolille',
      quickActions: [
        { label: 'Tietosuojaseloste', action: 'privacy-policy', icon: <FileText className="w-4 h-4" /> },
      ]
    },
    
    // Default/general help
    default: {
      keywords: [],
      response: 'Voin auttaa sinua seuraavissa asioissa:\n\n• Salasanan vaihto\n• Lukujärjestyksen katselu\n• Arvosanojen tarkistus\n• Viestien lähettäminen\n• Poissaolojen ilmoittaminen\n• Tekniset ongelmat\n\nKirjoita kysymyksesi tai valitse aihe alta!',
      quickActions: [
        { label: 'Salasana', action: 'password', icon: <Settings className="w-4 h-4" /> },
        { label: 'Lukujärjestys', action: 'schedule', icon: <Calendar className="w-4 h-4" /> },
        { label: 'Arvosanat', action: 'grades', icon: <FileText className="w-4 h-4" /> },
        { label: 'Viestit', action: 'messages', icon: <Mail className="w-4 h-4" /> },
      ]
    }
  };

  // Find best matching response based on keywords (rule-based)
  const findBestResponse = (userInput: string): { response: string; quickActions?: QuickAction[] } => {
    const input = userInput.toLowerCase();
    
    // Check each knowledge base entry
    for (const [key, data] of Object.entries(knowledgeBase)) {
      if (key === 'default') continue;
      
      // Check if any keyword matches
      const hasMatch = data.keywords.some(keyword => input.includes(keyword));
      if (hasMatch) {
        return { response: data.response, quickActions: data.quickActions };
      }
    }
    
    // Return default response if no match
    return { response: knowledgeBase.default.response, quickActions: knowledgeBase.default.quickActions };
  };

  // Handle sending message
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate typing delay (rule-based response generation)
    setTimeout(() => {
      const { response, quickActions } = findBestResponse(inputText);
      
      const owlMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'owl',
        timestamp: new Date(),
        quickActions
      };
      
      setMessages(prev => [...prev, owlMessage]);
      setIsTyping(false);
    }, 800);
  };

  // Handle quick action
  const handleQuickAction = (action: string) => {
    // Simulate clicking quick action
    const actionMessages: Record<string, string> = {
      password: 'Kuinka vaihdan salasanani?',
      schedule: 'Missä näen lukujärjestykseni?',
      grades: 'Kuinka tarkistan arvosanani?',
      messages: 'Kuinka lähetän viestin?',
      'open-settings': 'Avaa asetukset',
      'open-schedule': 'Avaa lukujärjestys',
      'open-grades': 'Avaa arvosanat',
      'open-messages': 'Avaa viestit',
      'contact-support': 'Haluan ottaa yhteyttä tukeen'
    };

    const message = actionMessages[action] || action;
    setInputText(message);
    handleSendMessage();
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="border-gray-200 dark:border-gray-700 h-[600px] max-h-[80vh] flex flex-col max-w-full overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
            🦉
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg truncate">Tuki Pöllö</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">Älykäs tukijärjestelmä</p>
          </div>
          <Badge variant="outline" className="ml-auto flex-shrink-0">
            <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
            Online
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
              <div
                className={`rounded-lg p-3 break-words ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                <p className="text-sm whitespace-pre-line break-words">{message.text}</p>
              </div>
              
              {/* Quick Actions */}
              {message.quickActions && message.quickActions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {message.quickActions.map((action, idx) => (
                    <Button
                      key={idx}
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAction(action.action)}
                      className="text-xs"
                    >
                      {action.icon}
                      <span className="ml-1">{action.label}</span>
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {message.timestamp.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <div className="border-t p-4 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Kirjoita kysymyksesi..."
            className="flex-1 min-w-0"
          />
          <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700 flex-shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Tuki Pöllö käyttää sääntöpohjaista logiikkaa - ei tekoälyä
        </p>
      </div>
    </Card>
  );
}
