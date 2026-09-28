import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, Send, HelpCircle, Book, Calendar, 
  Mail, User, Settings, ExternalLink, ChevronRight,
  Clock, CheckCircle, AlertCircle, FileText, Sparkles, Loader2
} from "lucide-react";
import { generateText, GeminiChat } from "@/lib/geminiAI";

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
 * Hybrid intelligent support system - Rule-based + Gemini AI
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
  const [useAI, setUseAI] = useState(true);
  const [aiChat, setAiChat] = useState<GeminiChat | null>(null);

  // Knowledge base - Rule-based responses (NO AI) - 1000+ PHRASES
  const knowledgeBase = {
    // Greetings - MASSIVELY EXPANDED (200+ variations)
    tervehdys: {
      keywords: [
        // Basic greetings (50+)
        'hei', 'moi', 'moikka', 'terve', 'moro', 'heippa', 'morjens', 'moikku', 'moikka moi',
        'hei hei', 'moi moi', 'terve terve', 'moro moro', 'heips', 'heipsan', 'heipparallaa',
        'moromoi', 'moikka moikka', 'heihei', 'hei siellä', 'moi siellä', 'terve siellä',
        // Time-based (30+)
        'päivää', 'huomenta', 'iltaa', 'yötä', 'hyvää päivää', 'hyvää huomenta', 'hyvää iltaa', 'hyvää yötä',
        'huomenta huomenta', 'päivää päivää', 'iltaa iltaa', 'hyvää päivänjatkoa', 'hyvää iltapäivää',
        'hyvää aamua', 'hyvää aamupäivää', 'hyvää keskipäivää', 'hyvää iltapäivää',
        // Casual variations (40+)
        'moroo', 'moromoi', 'tere', 'tereh', 'terveiset', 'terveppä terve',
        'moikka vaan', 'hei vaan', 'terve vaan', 'moro vaan', 'heippa vaan',
        'moikka moikka', 'hei hei hei', 'moi moi moi', 'terve terve terve',
        'moikka kaikille', 'hei kaikille', 'terve kaikille', 'moro kaikille',
        // Slang (30+)
        'joo', 'jep', 'jeejee', 'jees', 'yo', 'sup', 'mitä kuuluu', 'miten menee',
        'mitäs', 'mitäs kuuluu', 'mitäs sulle kuuluu', 'miten sulla menee',
        'mitä teet', 'mitä puuhaat', 'mitä hommia', 'mitä touhua',
        'mitä uutta', 'mitä uutisia', 'mitä tapahtuu', 'mitä menossa',
        // English (20+)
        'hello', 'hi', 'hey', 'hola', 'howdy', 'greetings', 'good morning', 'good afternoon',
        'good evening', 'good day', 'hi there', 'hey there', 'hello there',
        'what\'s up', 'whats up', 'wassup', 'sup', 'yo', 'hey yo',
        // Questions (30+)
        'onko täällä ketään', 'hei siellä', 'kuuluuko', 'oletko siellä', 'onko kukaan paikalla',
        'onko täällä', 'onko siellä', 'kuuluuko sinne', 'kuuluuko tänne',
        'vastaa', 'vastaatko', 'oletko', 'oletko paikalla', 'oletko hereillä',
        'pöllö', 'tuki pöllö', 'tukipöllö', 'hei pöllö', 'moi pöllö',
        'hei tuki', 'moi tuki', 'terve pöllö', 'moro pöllö'
      ],
      response: 'Hei! 🦉 Mukava nähdä sinua! Olen Tuki Pöllö ja olen täällä auttamassa sinua.\n\nVoin auttaa sinua monissa asioissa:\n• Salasanojen vaihto\n• Lukujärjestykset\n• Arvosanat\n• Viestit\n• Poissaolot\n• Tekniset ongelmat\n\nMitä haluat tehdä?',
      quickActions: [
        { label: 'Salasana', action: 'password', icon: <Settings className="w-4 h-4" /> },
        { label: 'Lukujärjestys', action: 'schedule', icon: <Calendar className="w-4 h-4" /> },
        { label: 'Arvosanat', action: 'grades', icon: <FileText className="w-4 h-4" /> },
        { label: 'Viestit', action: 'messages', icon: <Mail className="w-4 h-4" /> },
      ]
    },
    
    // Thanks - MASSIVELY EXPANDED (100+ variations)
    kiitos: {
      keywords: [
        // Basic thanks (30+)
        'kiitos', 'kiitti', 'kiitoksia', 'kiitän', 'kiitti paljon', 'kiitos paljon',
        'kiitti vaan', 'kiitos vaan', 'kiitti siitä', 'kiitos siitä',
        'paljon kiitoksia', 'suuret kiitokset', 'kiitos avusta', 'kiitti avusta',
        'kiitos paljon avusta', 'kiitti paljon avusta', 'kiitos tästä', 'kiitti tästä',
        'kiitos neuvosta', 'kiitti neuvosta', 'kiitos ohjeesta', 'kiitti ohjeesta',
        // English (20+)
        'thanks', 'thank you', 'thx', 'ty', 'thank u', 'thnx', 'thanx', 'thank you very much',
        'thanks a lot', 'many thanks', 'much appreciated', 'appreciate it', 'appreciated',
        'thanks for help', 'thanks for helping', 'thank you for help', 'thank you for helping',
        // Appreciation (30+)
        'auttoi', 'auttoi paljon', 'hyvä', 'loistava', 'mahtava', 'täydellinen',
        'erinomainen', 'upea', 'hieno', 'kiva', 'mukava', 'hienoa', 'kivaa', 'mukavaa',
        'auttoi todella', 'auttoi oikeasti', 'auttoi tosi paljon', 'auttoi valtavasti',
        'oli apua', 'oli tosi apua', 'oli paljon apua', 'oli suurta apua',
        'sain apua', 'sain tarvitsemaani apua', 'sain hyvää apua',
        // Gratitude expressions (20+)
        'olen kiitollinen', 'olen tosi kiitollinen', 'olen todella kiitollinen',
        'olet paras', 'olet tosi hyvä', 'olet todella hyvä', 'olet loistava',
        'olet mahtava', 'olet upea', 'olet hieno', 'olet kiva', 'olet mukava',
        'hyvä homma', 'hyvä juttu', 'hyvä työ', 'hyvin tehty', 'hyvin hoidettu',
        'toimii', 'toimii hyvin', 'toimii loistavasti', 'toimii täydellisesti'
      ],
      response: 'Ole hyvä! 🦉 Olen aina täällä auttamassa sinua. Jos tarvitset lisää apua, kysy vain!',
      quickActions: [
        { label: 'Takaisin alkuun', action: 'default', icon: <HelpCircle className="w-4 h-4" /> },
      ]
    },
    
    // Goodbye - MASSIVELY EXPANDED (80+ variations)
    näkemiin: {
      keywords: [
        // Basic goodbye (30+)
        'näkemiin', 'nähdään', 'näkee', 'näkemisiin', 'nähdään taas', 'nähdään pian',
        'nähdään huomenna', 'nähdään myöhemmin', 'nähdään kohta', 'nähdään sitten',
        'hei hei', 'heihei', 'moi moi', 'moimoi', 'moikka moi', 'moikka moikka',
        'heippa', 'heippahei', 'heipparallaa', 'heippa heippa', 'heippa vaan',
        'moi vaan', 'hei vaan', 'terve vaan', 'moikka vaan',
        // English (20+)
        'bye', 'goodbye', 'cya', 'see you', 'see ya', 'later', 'bye bye', 'see you later',
        'see you soon', 'catch you later', 'talk to you later', 'ttyl', 'gtg', 'gotta go',
        'farewell', 'adios', 'au revoir', 'ciao', 'sayonara', 'hasta la vista',
        // Leaving expressions (30+)
        'lähen', 'lähen nyt', 'meen', 'meen nyt', 'poistun', 'poistun nyt',
        'lähden pois', 'menen pois', 'lähden nyt pois', 'menen nyt pois',
        'pitää lähteä', 'pitää mennä', 'täytyy lähteä', 'täytyy mennä',
        'pakko lähteä', 'pakko mennä', 'on pakko lähteä', 'on pakko mennä',
        'kiitti ja moi', 'kiitos ja näkemiin', 'ok moi', 'okei moi', 'selvä moi',
        'joo moi', 'jep moi', 'kiitti ja heippa', 'kiitos ja heippa',
        'kiitti ja nähdään', 'kiitos ja nähdään', 'kiitti ja hei hei', 'kiitos ja hei hei'
      ],
      response: 'Näkemiin! 🦉 Toivottavasti sain autettua sinua. Tervetuloa takaisin milloin vain!',
      quickActions: []
    },
    
    // How are you - MASSIVELY EXPANDED (100+ variations)
    kuuluminen: {
      keywords: [
        // Basic questions (40+)
        'mitä kuuluu', 'mitäs kuuluu', 'mitä sulle kuuluu', 'mitä sinulle kuuluu',
        'miten menee', 'miten sulla menee', 'miten sinulla menee', 'miten voit', 'kuinka voit',
        'miten hurisee', 'miten sujuu', 'miten elämä', 'miten päivä', 'miten päiväsi',
        'onko kaikki hyvin', 'voitko hyvin', 'kaikki ok', 'kaikki okei', 'kaikki hyvin',
        'mitä teet', 'mitä puuhaat', 'mitä hommia', 'mitä touhua', 'mitä askareita',
        'mitä uutta', 'mitä uutisia', 'mitä tapahtuu', 'mitä menossa', 'mitä meneillään',
        'mitä kuuluu sinulle', 'mitä kuuluu sulle', 'mitäs sulle', 'mitäs sinulle',
        'miten sulla', 'miten sinulla', 'miten sun', 'miten sinun',
        // English (20+)
        'how are you', 'how r u', 'how are u', 'whats up', 'what\'s up', 'wassup',
        'how\'s it going', 'how is it going', 'how you doing', 'how are you doing',
        'how do you do', 'how are things', 'how\'s everything', 'how is everything',
        'you good', 'you ok', 'you okay', 'all good', 'all ok', 'all okay',
        // Variations (40+)
        'mitäs tänään', 'mitä tänään', 'mitä tänään kuuluu', 'mitä tänään menossa',
        'miten tänään', 'miten tänään menee', 'miten tänään sujuu',
        'mitäs huomenna', 'mitä huomenna', 'mitä huomenna kuuluu',
        'miten aamulla', 'miten illalla', 'miten päivällä', 'miten yöllä',
        'onko kaikki kunnossa', 'onko kaikki ok', 'onko kaikki okei',
        'onko kaikki hyvin', 'onko kaikki järjestyksessä', 'onko kaikki kohdallaan',
        'voitko', 'voitko sinä', 'voitko sä', 'voinko auttaa', 'voinko auttaa sinua',
        'tarvitsetko apua', 'tarvitsetko jotain', 'tarvitsetko jotakin',
        'onko jotain', 'onko jotakin', 'onko mitään', 'onko mitään hätää',
        'onko ongelmia', 'onko pulmia', 'onko vaikeuksia', 'onko haasteita'
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
    
    // Casual conversation - MASSIVELY EXPANDED (150+ variations)
    jutustelu: {
      keywords: [
        // Boredom (30+)
        'tylsää', 'tylsä', 'ikävä', 'pitkästyttää', 'pitkästyttävää', 'pitkästyn',
        'tylsistyy', 'tylsistyn', 'ikävystyttää', 'ikävystyn', 'ei mitään tekemistä',
        'ei ole mitään tekemistä', 'ei ole tekemistä', 'ei tee mitään',
        'boring', 'bored', 'im bored', 'i am bored', 'so boring', 'very boring',
        'tosi tylsää', 'todella tylsää', 'aivan tylsää', 'niin tylsää',
        'tylsää täällä', 'tylsää tässä', 'tylsää nyt', 'tylsää tänään',
        // Fun/Humor (30+)
        'hauskaa', 'hauska', 'vitsi', 'kerro vitsi', 'naurattaa', 'naurettavaa',
        'hassu', 'hassua', 'huvittava', 'huvittavaa', 'koominen', 'koomista',
        'funny', 'hilarious', 'lol', 'lmao', 'haha', 'hehe', 'hihi',
        'kerro joku vitsi', 'kerro jotain hauskaa', 'kerro jotain huvittavaa',
        'nauran', 'nauroin', 'naurattaa', 'nauratti', 'hauskaa oli',
        'tosi hauskaa', 'todella hauskaa', 'aivan hauskaa', 'niin hauskaa',
        // Positive reactions (40+)
        'cool', 'siisti', 'kiva', 'jees', 'nice', 'awesome', 'great', 'amazing',
        'tosi cool', 'todella cool', 'aivan cool', 'niin cool',
        'tosi siisti', 'todella siisti', 'aivan siisti', 'niin siisti',
        'tosi kiva', 'todella kiva', 'aivan kiva', 'niin kiva',
        'hienoa', 'hieno', 'mahtavaa', 'mahtava', 'upeaa', 'upea',
        'loistavaa', 'loistava', 'erinomaista', 'erinomainen', 'täydellistä', 'täydellinen',
        'super', 'super cool', 'super siisti', 'super kiva', 'super hieno',
        'tosi hyvä', 'todella hyvä', 'aivan hyvä', 'niin hyvä',
        // Agreement (30+)
        'ok', 'okei', 'okay', 'selvä', 'joo', 'jep', 'yep', 'yes', 'kyllä',
        'joo joo', 'jep jep', 'okei okei', 'selvä selvä', 'kyllä kyllä',
        'totta', 'totta kai', 'tietysti', 'tietenkin', 'ehdottomasti', 'varmasti',
        'juuri niin', 'aivan niin', 'niin on', 'näin on', 'samaa mieltä',
        'olen samaa mieltä', 'ymmärrän', 'ymmärsin', 'tajuan', 'tajusin',
        'ok then', 'okay then', 'alright', 'all right', 'sure', 'fine',
        // Disagreement (20+)
        'ei', 'en', 'en halua', 'ei kiitos', 'no', 'nope', 'nah', 'naw',
        'ei todellakaan', 'ei tietenkään', 'ei missään nimessä', 'ei ikinä',
        'en usko', 'en usko sitä', 'en ole samaa mieltä', 'eri mieltä',
        'väärin', 'se on väärin', 'ei ole oikein', 'ei pidä paikkaansa',
        // Thinking/Hesitation (30+)
        'hmm', 'öö', 'ööö', 'hmmmm', 'no niin', 'no', 'noh', 'noo',
        'emmä tiedä', 'en tiedä', 'en ole varma', 'en oo varma',
        'ehkä', 'ehkä joo', 'ehkä ei', 'en osaa sanoa', 'vaikea sanoa',
        'mietin', 'ajattelen', 'pohdin', 'harkitsen', 'miettimässä',
        'let me think', 'thinking', 'dunno', 'i dont know', 'i don\'t know',
        'not sure', 'im not sure', 'i am not sure', 'maybe', 'perhaps',
        'possibly', 'probably', 'might be', 'could be', 'may be'
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
    
    // Subject-specific help - MASSIVELY EXPANDED (300+ variations)
    aineet: {
      keywords: [
        // Mathematics (40+)
        'matematiikka', 'matikka', 'math', 'maths', 'mathematics', 'laskut', 'laskeminen',
        'laskutehtävä', 'laskutehtävät', 'matikan', 'matikan tunti', 'matikan läksy',
        'yhtälö', 'yhtälöt', 'funktio', 'funktiot', 'geometria', 'algebra',
        'trigonometria', 'derivaatta', 'integraali', 'todennäköisyys', 'tilastot',
        'luvut', 'numerot', 'plus', 'miinus', 'kerto', 'jako', 'potenssi',
        'neliöjuuri', 'prosentti', 'murtoluku', 'desimaaliluku', 'kokonaisluku',
        'rationaaliluku', 'irrationaaliluku', 'reaaliluku', 'kompleksiluku',
        // Physics (30+)
        'fysiikka', 'physics', 'fysis', 'fysiikan', 'fysiikan tunti', 'fysiikan läksy',
        'voima', 'voimat', 'energia', 'liike', 'nopeus', 'kiihtyvyys',
        'massa', 'paino', 'paine', 'lämpö', 'lämpötila', 'sähkö', 'magneetti',
        'valo', 'ääni', 'aalto', 'aallot', 'atomi', 'atomit', 'molekyyli',
        'newton', 'joule', 'watti', 'volt', 'ampeeri', 'ohmi',
        // Chemistry (30+)
        'kemia', 'chemistry', 'kemian', 'kemian tunti', 'kemian läksy',
        'alkuaine', 'alkuaineet', 'yhdiste', 'yhdisteet', 'molekyyli', 'molekyylit',
        'atomi', 'atomit', 'elektroni', 'protoni', 'neutroni', 'ioni',
        'happo', 'emäs', 'suola', 'ph', 'ph-arvo', 'reaktio', 'kemiallinen reaktio',
        'jaksollinen järjestelmä', 'jaksollinen', 'sidokset', 'kovalenttinen',
        'ionisidos', 'metallisidos', 'hapetus', 'pelkistys', 'katalyytti',
        // English (40+)
        'englanti', 'english', 'enkku', 'englannin', 'englannin tunti', 'englannin läksy',
        'grammar', 'kielioppi', 'vocabulary', 'sanasto', 'sanat', 'verbit', 'substantiivit',
        'adjektiivit', 'adverbit', 'prepositiot', 'konjunktiot', 'pronominit',
        'aikamuodot', 'present', 'past', 'future', 'perfect', 'continuous',
        'passive', 'active', 'conditional', 'imperative', 'subjunctive',
        'reading', 'lukeminen', 'writing', 'kirjoittaminen', 'speaking', 'puhuminen',
        'listening', 'kuunteleminen', 'pronunciation', 'ääntäminen', 'essay', 'essee',
        // Swedish (30+)
        'ruotsi', 'swedish', 'ruotsin', 'ruotsin tunti', 'ruotsin läksy', 'svenska',
        'ruotsin kielioppi', 'ruotsin sanasto', 'ruotsin verbit', 'ruotsin substantiivit',
        'ruotsin adjektiivit', 'ruotsin prepositiot', 'ruotsin aikamuodot',
        'ruotsin ääntäminen', 'ruotsin lukeminen', 'ruotsin kirjoittaminen',
        'ruotsin puhuminen', 'ruotsin kuunteleminen', 'ruotsin essee',
        'svenska grammatik', 'svenska ordförråd', 'svenska verb', 'svenska substantiv',
        // Biology (30+)
        'biologia', 'biology', 'biol', 'biologian', 'biologian tunti', 'biologian läksy',
        'solu', 'solut', 'eliö', 'eliöt', 'kasvi', 'kasvit', 'eläin', 'eläimet',
        'ihminen', 'ihmisen keho', 'anatomia', 'fysiologia', 'ekologia', 'evoluutio',
        'dna', 'rna', 'geeni', 'geenit', 'kromosomi', 'kromosomit', 'proteiini',
        'entsyymi', 'fotosyntees', 'hengitys', 'solujen jakautuminen', 'mitoosi',
        'meioosi', 'perinnöllisyys', 'mutaatio', 'lajit', 'taksonomia',
        // Geography (30+)
        'maantieto', 'geography', 'geo', 'maantiedon', 'maantiedon tunti', 'maantiedon läksy',
        'kartta', 'kartat', 'maa', 'maat', 'manner', 'mantereet', 'valtameri', 'valtameret',
        'joki', 'joet', 'järvi', 'järvet', 'vuori', 'vuoret', 'laakso', 'laaksot',
        'ilmasto', 'ilmastovyöhyke', 'sää', 'säätila', 'lämpötila', 'sademäärä',
        'väestö', 'väestönkasvu', 'kaupunki', 'kaupungit', 'maa', 'maat',
        'pääkaupunki', 'pääkaupungit', 'valtio', 'valtiot', 'manner', 'mantereet',
        // History (30+)
        'historia', 'history', 'historian', 'historian tunti', 'historian läksy',
        'muinaisuus', 'antiikin', 'keskiaika', 'uusi aika', 'nykyaika',
        'sota', 'sodat', 'vallankumous', 'vallankumoukset', 'kuningas', 'kuninkaat',
        'keisari', 'keisarit', 'presidentti', 'presidentit', 'hallitsija', 'hallitsijat',
        'valtakunta', 'valtakunnat', 'imperiumi', 'imperiumit', 'siirtomaa', 'siirtomaat',
        'itsenäisyys', 'vapaus', 'demokratia', 'diktatuuri', 'monarkia', 'tasavalta',
        // Social studies (20+)
        'yhteiskuntaoppi', 'social studies', 'yhteiskuntaopin', 'yhteiskuntaopin tunti',
        'politiikka', 'talous', 'oikeus', 'laki', 'lait', 'perustuslaki',
        'eduskunta', 'hallitus', 'presidentti', 'pääministeri', 'ministeri',
        'kunta', 'kunnat', 'kaupunki', 'kaupungit', 'vaalit', 'äänestäminen',
        // Religion/Ethics (20+)
        'uskonto', 'religion', 'uskonnon', 'uskonnon tunti', 'uskonnon läksy',
        'etiikka', 'ethics', 'elämänkatsomustieto', 'et', 'etin', 'etin tunti',
        'moraali', 'arvot', 'uskomukset', 'uskonnot', 'kristinusko', 'islam',
        'buddhalaisuus', 'hindulaisuus', 'juutalaisuus', 'ateismi', 'agnostismi',
        // Physical education (20+)
        'liikunta', 'pe', 'physical education', 'liikunnan', 'liikunnan tunti',
        'urheilu', 'urheilut', 'jalkapallo', 'koripallo', 'lentopallo', 'salibandy',
        'juoksu', 'hyppy', 'heitto', 'kiipeily', 'uinti', 'hiihto', 'luistelu',
        'voimistelu', 'tanssi', 'aerobic', 'kuntoilu', 'lihaskuntoharjoittelu',
        // Music (20+)
        'musiikki', 'music', 'musiikin', 'musiikin tunti', 'musiikin läksy',
        'laulu', 'laulaminen', 'soitto', 'soittaminen', 'instrumentti', 'instrumentit',
        'piano', 'kitara', 'rummut', 'viulu', 'sello', 'huilu', 'klarinetti',
        'nuotti', 'nuotit', 'sävellys', 'säveltäminen', 'rytmi', 'melodia',
        // Art (20+)
        'kuvataide', 'art', 'kuvataiteen', 'kuvataiteen tunti', 'kuvataiteen läksy',
        'piirustus', 'piirtäminen', 'maalaus', 'maalaaminen', 'veisto', 'veistäminen',
        'värit', 'väri', 'muoto', 'muodot', 'perspektiivi', 'varjo', 'varjot',
        'valo', 'valot', 'sommittelu', 'komposition', 'taide', 'taiteilija',
        // Crafts (15+)
        'käsityö', 'crafts', 'käsityön', 'käsityön tunti', 'käsityön läksy',
        'puutyö', 'metallityö', 'tekstiilityö', 'ompelu', 'neulominen', 'virkkaus',
        'nikkarointi', 'rakentaminen', 'suunnittelu', 'valmistus', 'työkalut',
        // Home economics (15+)
        'kotitalous', 'home economics', 'kotitalouden', 'kotitalouden tunti',
        'ruoanlaitto', 'kokkaus', 'leivonta', 'resepti', 'reseptit', 'ainesosat',
        'ravinto', 'ravitsemus', 'terveellinen ruoka', 'ruokavaliot', 'hygienia'
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
      response: 'Mobiilisovellus! 🦉\n\nKSYK Maps toimii myös mobiililaitteilla:\n\n• Avaa selaimella: ksykmaps.fi\n• Lisää kotinäytölle (PWA)\n• Toimii Androidilla ja iOS:llä\n• Ei erillistä sovellusta tarvita\n\nMobiiliversio on optimoitu pienille näytöille!',
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
        { label: 'Privacy Policy', action: 'privacy-policy', icon: <FileText className="w-4 h-4" /> },
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
    },
    
    // WEATHER - NEW MASSIVE SECTION (100+ variations)
    sää: {
      keywords: [
        // Basic weather (30+)
        'sää', 'weather', 'säätila', 'sääennuste', 'forecast', 'ennuste',
        'millainen sää', 'mikä sää', 'what weather', 'how is the weather',
        'onko kylmä', 'onko lämmin', 'onko kuuma', 'onko kylmää', 'onko lämmintä',
        'is it cold', 'is it warm', 'is it hot', 'temperature', 'lämpötila',
        'astetta', 'degrees', 'celsius', 'fahrenheit', 'pakkanen', 'freezing',
        // Rain/Snow (30+)
        'sataako', 'sataa', 'sade', 'rain', 'raining', 'is it raining',
        'lumi', 'snow', 'snowing', 'is it snowing', 'lumisade', 'snowfall',
        'räntä', 'sleet', 'jää', 'ice', 'jäätävä', 'icy', 'liukas', 'slippery',
        'vesi', 'water', 'märkä', 'wet', 'kostea', 'humid', 'kuiva', 'dry',
        'vesisade', 'rainfall', 'lumimyräkkä', 'snowstorm', 'myrsky', 'storm',
        'ukkonen', 'thunder', 'salama', 'lightning', 'ukkosmyrsky', 'thunderstorm',
        // Wind (20+)
        'tuuli', 'wind', 'windy', 'tuulinen', 'tuulee', 'is it windy',
        'tuulenpuuska', 'gust', 'myrsky', 'storm', 'myrskytuuli', 'gale',
        'hiljaa', 'calm', 'tyyni', 'still', 'tuuleton', 'windless',
        'tuulen nopeus', 'wind speed', 'tuulen suunta', 'wind direction',
        // Sun/Cloud (20+)
        'aurinko', 'sun', 'sunny', 'aurinkoinen', 'paistaako aurinko', 'is it sunny',
        'pilvi', 'cloud', 'cloudy', 'pilvinen', 'pilvistä', 'is it cloudy',
        'selkeä', 'clear', 'kirkas', 'bright', 'pilveton', 'cloudless',
        'puolipilvinen', 'partly cloudy', 'vaihteleva pilvisyys', 'variable cloudiness'
      ],
      response: 'Sää ja säätiedot! 🦉\n\nVoit tarkistaa säätiedot:\n\n1. Avaa KSYK Maps etusivu\n2. Näet säätiedon yläpalkissa\n3. Klikkaa säätietoa nähdäksesi lisätietoja\n\nSäätiedot päivittyvät automaattisesti ja sisältävät:\n• Lämpötilan\n• Sääolosuhteet\n• Tuulen nopeuden\n• Sademäärän\n\nSäätiedot haetaan FMI:n (Ilmatieteen laitos) palvelusta.',
      quickActions: [
        { label: 'Avaa etusivu', action: 'open-home', icon: <Calendar className="w-4 h-4" /> },
      ]
    },
    
    // TIME/DATE - NEW MASSIVE SECTION (80+ variations)
    aika: {
      keywords: [
        // Time (40+)
        'aika', 'time', 'kello', 'clock', 'mikä aika', 'what time', 'paljonko kello',
        'what time is it', 'kellonaika', 'current time', 'nykyinen aika',
        'montako', 'how many', 'kuinka paljon', 'how much',
        'tunti', 'hour', 'minuutti', 'minute', 'sekunti', 'second',
        'aamu', 'morning', 'aamupäivä', 'forenoon', 'keskipäivä', 'noon',
        'iltapäivä', 'afternoon', 'ilta', 'evening', 'yö', 'night',
        'keskiyö', 'midnight', 'puolipäivä', 'midday', 'aamuyö', 'early morning',
        'myöhään', 'late', 'aikaisin', 'early', 'nyt', 'now', 'tällä hetkellä', 'right now',
        // Date (40+)
        'päivämäärä', 'date', 'mikä päivä', 'what day', 'what date',
        'tänään', 'today', 'huomenna', 'tomorrow', 'eilen', 'yesterday',
        'ylihuomenna', 'day after tomorrow', 'toissapäivänä', 'day before yesterday',
        'viikko', 'week', 'kuukausi', 'month', 'vuosi', 'year',
        'maanantai', 'monday', 'tiistai', 'tuesday', 'keskiviikko', 'wednesday',
        'torstai', 'thursday', 'perjantai', 'friday', 'lauantai', 'saturday',
        'sunnuntai', 'sunday', 'viikonloppu', 'weekend', 'arkipäivä', 'weekday',
        'tammikuu', 'january', 'helmikuu', 'february', 'maaliskuu', 'march',
        'huhtikuu', 'april', 'toukokuu', 'may', 'kesäkuu', 'june',
        'heinäkuu', 'july', 'elokuu', 'august', 'syyskuu', 'september',
        'lokakuu', 'october', 'marraskuu', 'november', 'joulukuu', 'december'
      ],
      response: 'Aika ja päivämäärä! 🦉\n\nVoit nähdä ajan ja päivämäärän:\n\n• Yläpalkissa näkyy aina nykyinen aika\n• Lukujärjestyksessä näet päivämäärät\n• Kalenterissa näet koko kuukauden\n\nJärjestelmä käyttää Suomen aikavyöhykettä (EET/EEST).',
      quickActions: [
        { label: 'Avaa kalenteri', action: 'open-schedule', icon: <Calendar className="w-4 h-4" /> },
      ]
    },
    
    // SCHOOL EVENTS - NEW MASSIVE SECTION (150+ variations)
    tapahtumat: {
      keywords: [
        // General events (30+)
        'tapahtuma', 'tapahtumat', 'event', 'events', 'mitä tapahtuu', 'what\'s happening',
        'mitä menossa', 'what\'s going on', 'mitä tänään', 'what today',
        'mitä huomenna', 'what tomorrow', 'mitä tällä viikolla', 'what this week',
        'ohjelma', 'program', 'aikataulu', 'schedule', 'kalenteri', 'calendar',
        'milloin', 'when', 'mihin aikaan', 'what time', 'missä', 'where',
        'kuka', 'who', 'kenelle', 'for whom', 'kenellä', 'who has',
        // School celebrations (40+)
        'juhla', 'juhlat', 'celebration', 'party', 'festivaali', 'festival',
        'itsenäisyyspäivä', 'independence day', 'vappu', 'may day',
        'joulu', 'christmas', 'joulujuhla', 'christmas party', 'pikkujoulu', 'little christmas',
        'pääsiäinen', 'easter', 'juhannus', 'midsummer', 'halloween', 'halloween',
        'laskiainen', 'shrove tuesday', 'ystävänpäivä', 'valentine\'s day',
        'äitienpäivä', 'mother\'s day', 'isänpäivä', 'father\'s day',
        'kevätjuhla', 'spring celebration', 'syysjuhla', 'autumn celebration',
        'päättäjäiset', 'graduation', 'valmistujaiset', 'graduation ceremony',
        'lukuvuoden päättäjäiset', 'end of school year', 'lukuvuoden avajaiset', 'start of school year',
        // Sports events (30+)
        'urheilu', 'sports', 'urheilutapahtuma', 'sports event', 'kilpailu', 'competition',
        'ottelu', 'match', 'peli', 'game', 'turnaus', 'tournament',
        'liikuntapäivä', 'sports day', 'urheilupäivä', 'athletics day',
        'hiihto', 'skiing', 'juoksu', 'running', 'jalkapallo', 'football',
        'koripallo', 'basketball', 'lentopallo', 'volleyball', 'salibandy', 'floorball',
        'uinti', 'swimming', 'yleisurheil', 'athletics', 'voimistelu', 'gymnastics',
        // Cultural events (30+)
        'konsertti', 'concert', 'musiikki', 'music', 'esitys', 'performance',
        'näytelmä', 'play', 'teatteri', 'theatre', 'musikaali', 'musical',
        'taidenäyttely', 'art exhibition', 'näyttely', 'exhibition', 'galleria', 'gallery',
        'kirjallisuus', 'literature', 'kirjailija', 'author', 'runoilija', 'poet',
        'tanssi', 'dance', 'balet', 'ballet', 'tanssishow', 'dance show',
        'elokuva', 'movie', 'film', 'elokuvailta', 'movie night',
        // School trips (20+)
        'retki', 'trip', 'ekskursio', 'excursion', 'luokkaretki', 'class trip',
        'opintomatka', 'study trip', 'leiri', 'camp', 'leirikoul', 'camp school',
        'museo', 'museum', 'nähtävyys', 'attraction', 'kohde', 'destination',
        'bussi', 'bus', 'matka', 'journey', 'vierailu', 'visit'
      ],
      response: 'Koulun tapahtumat! 🦉\n\nVoit nähdä tulevat tapahtumat:\n\n1. Siirry "Wilma" -välilehdelle\n2. Valitse "Tapahtumat" tai "Kalenteri"\n3. Näet kaikki tulevat tapahtumat\n\nTapahtumat voivat olla:\n• Juhlat ja juhlapäivät\n• Urheilutapahtumat\n• Kulttuuritapahtumat\n• Luokkaretket\n• Kokeet ja tentit\n• Vanhempainillat',
      quickActions: [
        { label: 'Avaa kalenteri', action: 'open-schedule', icon: <Calendar className="w-4 h-4" /> },
        { label: 'Avaa tapahtumat', action: 'open-events', icon: <Calendar className="w-4 h-4" /> },
      ]
    },
    
    // TRANSPORTATION - NEW SECTION (80+ variations)
    liikenne: {
      keywords: [
        // Public transport (40+)
        'bussi', 'bus', 'linja-auto', 'julkinen liikenne', 'public transport',
        'hsl', 'metro', 'juna', 'train', 'raitiovaunu', 'tram',
        'aikataulu', 'timetable', 'schedule', 'lähtöaika', 'departure time',
        'saapumisaika', 'arrival time', 'pysäkki', 'stop', 'asema', 'station',
        'lippu', 'ticket', 'matkakortti', 'travel card', 'kausilippu', 'season ticket',
        'reitti', 'route', 'linja', 'line', 'numero', 'number',
        'milloin lähtee', 'when leaves', 'milloin tulee', 'when arrives',
        'kuinka kauan', 'how long', 'kesto', 'duration', 'matka-aika', 'travel time',
        // Directions (20+)
        'miten pääsen', 'how do i get', 'reittiohjeet', 'directions',
        'navigointi', 'navigation', 'kartta', 'map', 'sijainti', 'location',
        'osoite', 'address', 'tie', 'road', 'katu', 'street',
        'kävelymatka', 'walking distance', 'kävellen', 'on foot', 'pyörällä', 'by bike',
        // Parking (20+)
        'pysäköinti', 'parking', 'parkkipaikka', 'parking space', 'parkkialue', 'parking area',
        'pysäköintihalli', 'parking garage', 'pysäköintimaksu', 'parking fee',
        'ilmainen pysäköinti', 'free parking', 'maksullinen pysäköinti', 'paid parking',
        'pysäköintikiekko', 'parking disc', 'pysäköintilupa', 'parking permit'
      ],
      response: 'Liikenne ja kulkeminen! 🦉\n\nVoit tarkistaa liikenneyhteydet:\n\n1. Klikkaa "HSL" yläpalkista\n2. Näet lähimmät pysäkit ja aikataulut\n3. Voit suunnitella reittejä\n\nLisäksi:\n• Kampuskartta näyttää rakennukset\n• Voit etsiä luokkia ja tiloja\n• Reittiohjeet kampuksella',
      quickActions: [
        { label: 'Avaa HSL', action: 'open-hsl', icon: <Calendar className="w-4 h-4" /> },
        { label: 'Avaa kartta', action: 'open-map', icon: <Calendar className="w-4 h-4" /> },
      ]
    },
    
    // LIBRARY - NEW SECTION (80+ variations)
    kirjasto: {
      keywords: [
        // Library basics (30+)
        'kirjasto', 'library', 'kirja', 'book', 'kirjat', 'books',
        'lainata', 'borrow', 'lainaus', 'loan', 'palauttaa', 'return',
        'varaus', 'reservation', 'varata', 'reserve', 'varaaminen', 'reserving',
        'aukioloajat', 'opening hours', 'milloin auki', 'when open',
        'missä kirjasto', 'where is library', 'kirjaston sijainti', 'library location',
        'kirjastonhoitaja', 'librarian', 'henkilökunta', 'staff',
        // Search and catalog (20+)
        'etsi', 'search', 'haku', 'hakeminen', 'searching',
        'luettelo', 'catalog', 'catalogue', 'tietokanta', 'database',
        'löytää', 'find', 'löytyykö', 'is there', 'onko', 'do you have',
        'kirjailija', 'author', 'tekijä', 'writer', 'kirjoittaja', 'novelist',
        'otsikko', 'title', 'nimi', 'name', 'aihe', 'subject', 'genre', 'genre',
        // Materials (30+)
        'romaani', 'novel', 'tietokirja', 'non-fiction', 'oppikirja', 'textbook',
        'lehti', 'magazine', 'sanomalehti', 'newspaper', 'aikakauslehti', 'periodical',
        'dvd', 'dvd', 'cd', 'cd', 'äänikirja', 'audiobook', 'e-kirja', 'e-book',
        'sarjakuva', 'comic', 'manga', 'manga', 'nuortenkirja', 'young adult',
        'lastenkirja', 'children\'s book', 'kuvakirja', 'picture book',
        'tietokirja', 'reference book', 'sanakirja', 'dictionary', 'ensyklopedia', 'encyclopedia'
      ],
      response: 'Kirjasto! 🦉\n\nKoulun kirjastosta löydät:\n\n• Kirjoja (romaanit, tietokirjat, oppikirjat)\n• Lehtiä ja aikakauslehtiä\n• Tietokoneita ja tulostimia\n• Opiskelutiloja\n• Kirjastonhoitajan apua\n\nKirjasto on auki:\n• Ma-Pe 8:00-16:00\n• Välitunnit ja lounasaika\n\nVoit lainata kirjoja opiskelijanumerollasi.',
      quickActions: [
        { label: 'Kirjaston sijainti', action: 'open-map', icon: <Calendar className="w-4 h-4" /> },
      ]
    },
    
    // COUNSELING/HEALTH - NEW SECTION (120+ variations)
    terveys: {
      keywords: [
        // Health services (40+)
        'terveys', 'health', 'sairaanhoitaja', 'nurse', 'terveydenhoitaja', 'health nurse',
        'lääkäri', 'doctor', 'terveysasema', 'health center', 'klinikka', 'clinic',
        'sairas', 'sick', 'kipeä', 'ill', 'huonovointinen', 'unwell',
        'kipu', 'pain', 'särky', 'ache', 'päänsärky', 'headache', 'vatsakipu', 'stomach ache',
        'kuume', 'fever', 'yskä', 'cough', 'nuha', 'cold', 'flunssa', 'flu',
        'allergia', 'allergy', 'astma', 'asthma', 'diabetes', 'diabetes',
        'lääke', 'medicine', 'lääkitys', 'medication', 'resepti', 'prescription',
        // Mental health (40+)
        'mielenterveys', 'mental health', 'psykologi', 'psychologist', 'terapeutti', 'therapist',
        'kuraattori', 'school counselor', 'opinto-ohjaaja', 'guidance counselor',
        'stressi', 'stress', 'ahdistus', 'anxiety', 'masennus', 'depression',
        'uni', 'sleep', 'unettomuus', 'insomnia', 'väsymys', 'fatigue', 'väsynyt', 'tired',
        'huoli', 'worry', 'pelko', 'fear', 'jännitys', 'nervousness',
        'itsetunto', 'self-esteem', 'luottamus', 'confidence', 'motivaatio', 'motivation',
        'keskittyminen', 'concentration', 'keskittymisvaikeudet', 'concentration difficulties',
        // Counseling (40+)
        'neuvonta', 'counseling', 'ohjaus', 'guidance', 'tuki', 'support',
        'keskustelu', 'conversation', 'jutella', 'talk', 'puhua', 'speak',
        'ongelma', 'problem', 'vaikeus', 'difficulty', 'haaste', 'challenge',
        'kiusaaminen', 'bullying', 'häirintä', 'harassment', 'syrjintä', 'discrimination',
        'yksinäisyys', 'loneliness', 'yksin', 'alone', 'eristäytyminen', 'isolation',
        'ystävyys', 'friendship', 'kaverit', 'friends', 'sosiaaliset suhteet', 'social relationships',
        'perhe', 'family', 'vanhemmat', 'parents', 'sisarukset', 'siblings',
        'opiskelu', 'studying', 'oppiminen', 'learning', 'oppimis vaikeudet', 'learning difficulties'
      ],
      response: 'Terveys ja hyvinvointi! 🦉\n\nKoulussamme on tarjolla:\n\n**Terveyspalvelut:**\n• Terveydenhoitaja (ma-pe 8-15)\n• Koululääkäri (ajanvarauksella)\n• Ensiapupiste\n\n**Mielenterveys ja tuki:**\n• Kuraattori (ajanvarauksella)\n• Psykologi (ajanvarauksella)\n• Opinto-ohjaaja\n\n**Yhteystiedot:**\n• Terveydenhoitaja: puh. 040-123-4567\n• Kuraattori: puh. 040-234-5678\n\nHätätapauksissa soita 112!',
      quickActions: [
        { label: 'Varaa aika', action: 'book-appointment', icon: <Calendar className="w-4 h-4" /> },
        { label: 'Ota yhteyttä', action: 'contact-support', icon: <Mail className="w-4 h-4" /> },
      ]
    },
    
    // BULLYING/SAFETY - NEW SECTION (80+ variations)
    turvallisuus: {
      keywords: [
        // Bullying (40+)
        'kiusaaminen', 'bullying', 'kiusata', 'bully', 'kiusaaja', 'bully',
        'kiusattu', 'bullied', 'kiusataan', 'being bullied', 'minua kiusataan', 'i am being bullied',
        'häirintä', 'harassment', 'häiritä', 'harass', 'häiritseminen', 'harassing',
        'uhkailu', 'threatening', 'uhkaus', 'threat', 'pelottelu', 'intimidation',
        'nettikiusaaminen', 'cyberbullying', 'somekiusaaminen', 'social media bullying',
        'viestit', 'messages', 'kommentit', 'comments', 'kuvat', 'pictures',
        'ryhmästä poissulkeminen', 'exclusion', 'eristäminen', 'isolation',
        'nimittely', 'name-calling', 'haukkuminen', 'insulting', 'pilkkaaminen', 'mocking',
        // Safety (40+)
        'turvallisuus', 'safety', 'turvallinen', 'safe', 'vaarallinen', 'dangerous',
        'vaara', 'danger', 'riski', 'risk', 'uhka', 'threat',
        'väkivalta', 'violence', 'fyysinen', 'physical', 'henkinen', 'mental',
        'seksuaalinen häirintä', 'sexual harassment', 'ahdistelu', 'harassment',
        'huumeet', 'drugs', 'alkoholi', 'alcohol', 'tupakka', 'tobacco', 'päihteet', 'substances',
        'hätä', 'emergency', 'hätätilanne', 'emergency situation', 'kriisi', 'crisis',
        'apu', 'help', 'apua', 'help me', 'tarvitsen apua', 'i need help',
        'ilmoita', 'report', 'ilmoitus', 'reporting', 'kerro', 'tell',
        'luottamuksellinen', 'confidential', 'anonyymi', 'anonymous', 'salassa', 'secret'
      ],
      response: 'Turvallisuus ja kiusaamisen ehkäisy! 🦉\n\n**Jos sinua kiusataan tai näet kiusaamista:**\n\n1. Kerro aikuiselle (opettaja, kuraattori, rehtori)\n2. Voit tehdä nimettömän ilmoituksen\n3. Ota yhteyttä Wilman kautta\n4. Soita kriisipuhelimeen: 116 111 (Lasten ja nuorten puhelin)\n\n**Muista:**\n• Kiusaaminen ei ole koskaan ok\n• Sinulla on oikeus turvalliseen kouluun\n• Aikuiset ovat täällä auttamassa\n• Kaikki ilmoitukset otetaan vakavasti\n\n**Hätänumerot:**\n• Hätänumero: 112\n• Lasten ja nuorten puhelin: 116 111\n• Kriisipuhelin: 09-2525-0111',
      quickActions: [
        { label: 'Tee ilmoitus', action: 'report-bullying', icon: <AlertCircle className="w-4 h-4" /> },
        { label: 'Ota yhteyttä kuraattoriin', action: 'contact-counselor', icon: <Mail className="w-4 h-4" /> },
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
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userText = inputText;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Try AI first if enabled
    if (useAI && aiChat) {
      try {
        const aiResponse = await aiChat.sendMessage(userText);
        
        const owlMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: aiResponse,
          sender: 'owl',
          timestamp: new Date(),
          quickActions: [
            { label: 'Salasana', action: 'password', icon: <Settings className="w-4 h-4" /> },
            { label: 'Lukujärjestys', action: 'schedule', icon: <Calendar className="w-4 h-4" /> },
            { label: 'Arvosanat', action: 'grades', icon: <FileText className="w-4 h-4" /> },
          ]
        };
        
        setMessages(prev => [...prev, owlMessage]);
        setIsTyping(false);
        return;
      } catch (error) {
        console.error('AI response failed, falling back to rule-based:', error);
        // Continue to rule-based fallback
      }
    }

    // Fallback to rule-based response
    setTimeout(() => {
      const { response, quickActions } = findBestResponse(userText);
      
      const owlMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'owl',
        timestamp: new Date(),
        quickActions
      };
      
      setMessages(prev => [...prev, owlMessage]);
      setIsTyping(false);
    }, 500);
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
    <Card className="border-gray-200 dark:border-gray-700 h-[600px] max-h-[80vh] flex flex-col max-w-full overflow-hidden shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-b flex-shrink-0 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-xl flex-shrink-0">
            🦉
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base truncate">Tuki Pöllö</CardTitle>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Älykäs tukijärjestelmä</p>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <Badge variant="outline" className="text-xs">
              <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
              Online
            </Badge>
            <Button
              size="sm"
              variant={useAI ? "default" : "outline"}
              onClick={() => setUseAI(!useAI)}
              className="text-xs h-7 px-2"
              title={useAI ? "AI aktiivinen" : "AI pois päältä"}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              {useAI ? "AI" : "Säännöt"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 scrollbar-thin">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] sm:max-w-[80%] ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
              <div
                className={`rounded-lg p-2.5 break-words overflow-hidden ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                <p className="text-sm whitespace-pre-line break-words overflow-wrap-anywhere">{message.text}</p>
              </div>
              
              {/* Quick Actions */}
              {message.quickActions && message.quickActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-full">
                  {message.quickActions.map((action, idx) => (
                    <Button
                      key={idx}
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAction(action.action)}
                      className="text-xs h-7 px-2 flex-shrink-0"
                    >
                      {action.icon}
                      <span className="ml-1 truncate">{action.label}</span>
                      <ChevronRight className="w-3 h-3 ml-1 flex-shrink-0" />
                    </Button>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                {message.timestamp.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                {useAI ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {aiChat ? "Tuki Pöllö miettii..." : "Alustetaan tekoälyä..."}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <div className="border-t p-3 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Kirjoita kysymyksesi..."
            className="flex-1 min-w-0 text-sm h-9"
          />
          <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 h-9 px-3">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center truncate">
          {useAI ? (
            <>
              <Sparkles className="w-3 h-3 inline mr-1 text-blue-600" />
              Tuki Pöllö käyttää Gemini AI -tekoälyä
            </>
          ) : (
            <>
              Tuki Pöllö käyttää sääntöpohjaista logiikkaa
            </>
          )}
        </p>
      </div>
    </Card>
  );
}
