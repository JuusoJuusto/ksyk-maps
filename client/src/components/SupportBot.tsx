import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, X, Minimize2, Maximize2, HelpCircle, Sparkles } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  suggestions?: string[];
}

interface FAQItem {
  keywords: string[];
  question: string;
  answer: string;
  category: string;
}

// Knowledge base for the support bot
const FAQ_DATABASE: FAQItem[] = [
  {
    keywords: ['salasana', 'password', 'vaihda', 'unohdin', 'reset'],
    question: 'Miten vaihdan salasanani?',
    answer: 'Voit vaihtaa salasanasi menemällä Asetukset-välilehdelle ja valitsemalla "Vaihda salasana". Jos olet unohtanut salasanasi, klikkaa kirjautumissivulla "Unohditko salasanan?" -linkkiä.',
    category: 'Käyttäjätili'
  },
  {
    keywords: ['arvosanat', 'grades', 'näe', 'katso', 'puuttuu'],
    question: 'En näe kaikkia arvosanojani',
    answer: 'Arvosanat päivittyvät automaattisesti kun opettaja on syöttänyt ne järjestelmään. Jos arvosana puuttuu yli viikon kuluttua kokeesta, ota yhteyttä opettajaan.',
    category: 'Arvosanat'
  },
  {
    keywords: ['viesti', 'message', 'lähetä', 'opettaja', 'send'],
    question: 'Miten lähetän viestin opettajalle?',
    answer: 'Mene Viestit-välilehdelle, klikkaa "Uusi viesti" -painiketta, valitse vastaanottaja ja kirjoita viestisi. Muista olla kohtelias ja selkeä!',
    category: 'Viestit'
  },
  {
    keywords: ['lukujärjestys', 'schedule', 'tunnit', 'aikataulu'],
    question: 'Mistä näen lukujärjestykseni?',
    answer: 'Lukujärjestyksesi näkyy Etusivu-välilehdellä. Voit myös mennä Lukujärjestys-välilehdelle nähdäksesi koko viikon aikataulun.',
    category: 'Lukujärjestys'
  },
  {
    keywords: ['poissaolo', 'absence', 'sairas', 'sick', 'ilmoita'],
    question: 'Miten ilmoitan poissaolosta?',
    answer: 'Huoltajasi voi ilmoittaa poissaolostasi Wilman kautta tai soittamalla koululle. Jos olet sairaana, muista toimittaa lääkärintodistus yli 3 päivän poissaoloista.',
    category: 'Poissaolot'
  },
  {
    keywords: ['kotitehtävät', 'homework', 'tehtävät', 'palauta'],
    question: 'Miten palautan kotitehtävät?',
    answer: 'Mene Tehtävät-välilehdelle, valitse tehtävä ja klikkaa "Palauta". Voit ladata tiedostoja tai kirjoittaa vastauksesi suoraan järjestelmään. Muista palauttaa ennen määräaikaa!',
    category: 'Tehtävät'
  },
  {
    keywords: ['kirjaudu', 'login', 'sisään', 'ulos', 'logout'],
    question: 'En pääse kirjautumaan sisään',
    answer: 'Tarkista että käyttäjätunnuksesi ja salasanasi ovat oikein. Jos ongelma jatkuu, ota yhteyttä koulun IT-tukeen tai pyydä opettajaa nollaamaan salasanasi.',
    category: 'Kirjautuminen'
  },
  {
    keywords: ['ruoka', 'lunch', 'lounas', 'ruokalista'],
    question: 'Mistä näen ruokalistan?',
    answer: 'Ruokalista löytyy Lounas-välilehdeltä. Siellä näet koko viikon ruokalistan ja mahdolliset erityisruokavaliot.',
    category: 'Ruokailu'
  },
  {
    keywords: ['tuki', 'help', 'apua', 'ongelma', 'ei toimi'],
    question: 'Tarvitsen lisäapua',
    answer: 'Jos et löydä vastausta kysymykseesi, voit lähettää tukipyynnön Tuki-välilehdeltä. Koulun IT-tuki vastaa mahdollisimman pian!',
    category: 'Tuki'
  },
  {
    keywords: ['huoltaja', 'parent', 'vanhempi', 'äiti', 'isä'],
    question: 'Miten huoltajani pääsee Wilmaan?',
    answer: 'Huoltajasi saa omat kirjautumistunnukset koulusta. He voivat kirjautua samasta osoitteesta kuin sinäkin ja nähdä tietosi.',
    category: 'Huoltajat'
  },
  {
    keywords: ['koe', 'exam', 'test', 'tentti'],
    question: 'Milloin on seuraava koe?',
    answer: 'Tulevat kokeet näkyvät Etusivu-välilehdellä "Tulevat tapahtumat" -osiossa. Voit myös tarkistaa ne Lukujärjestys-välilehdeltä.',
    category: 'Kokeet'
  },
  {
    keywords: ['kartta', 'map', 'luokka', 'huone', 'löydä'],
    question: 'En löydä luokkahuonetta',
    answer: 'Käytä KSYK Maps -sovellusta löytääksesi luokkahuoneet! Voit hakea huonenumerolla tai opettajan nimellä.',
    category: 'Navigointi'
  }
];

// Greeting messages
const GREETINGS = [
  'Hei! Olen Apu-Pöllö, Wilman tukibotti. 🦉',
  'Moi! Apu-Pöllö täällä, valmis auttamaan! 🦉',
  'Terve! Apu-Pöllö palveluksessasi! 🦉'
];

// Default suggestions
const DEFAULT_SUGGESTIONS = [
  'Miten vaihdan salasanani?',
  'En näe arvosanojani',
  'Miten lähetän viestin?',
  'Mistä näen lukujärjestykseni?'
];

export default function SupportBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      addBotMessage(
        `${greeting}\n\nMiten voin auttaa sinua tänään?`,
        DEFAULT_SUGGESTIONS
      );
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addBotMessage = (text: string, suggestions?: string[]) => {
    const message: Message = {
      id: Date.now().toString(),
      text,
      sender: 'bot',
      timestamp: new Date(),
      suggestions
    };
    setMessages(prev => [...prev, message]);
  };

  const addUserMessage = (text: string) => {
    const message: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const findBestMatch = (query: string): FAQItem | null => {
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/);

    let bestMatch: FAQItem | null = null;
    let bestScore = 0;

    for (const faq of FAQ_DATABASE) {
      let score = 0;
      for (const keyword of faq.keywords) {
        if (lowerQuery.includes(keyword)) {
          score += 2;
        }
        for (const word of words) {
          if (keyword.includes(word) || word.includes(keyword)) {
            score += 1;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = faq;
      }
    }

    return bestScore > 0 ? bestMatch : null;
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userQuery = inputValue.trim();
    addUserMessage(userQuery);
    setInputValue('');
    setIsTyping(true);

    // Simulate thinking delay
    setTimeout(() => {
      const match = findBestMatch(userQuery);

      if (match) {
        // Found a match
        const relatedQuestions = FAQ_DATABASE
          .filter(faq => faq.category === match.category && faq.question !== match.question)
          .slice(0, 3)
          .map(faq => faq.question);

        addBotMessage(match.answer, relatedQuestions.length > 0 ? relatedQuestions : DEFAULT_SUGGESTIONS);
      } else {
        // No match found
        addBotMessage(
          'Hmm, en ole varma miten vastata tuohon kysymykseen. 🤔\n\nVoit:\n• Kokeilla kysyä toisin\n• Valita jonkin alla olevista aiheista\n• Lähettää tukipyynnön Tuki-välilehdeltä',
          DEFAULT_SUGGESTIONS
        );
      }

      setIsTyping(false);
    }, 800);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSendMessage();
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg z-50 flex items-center justify-center"
        title="Avaa Apu-Pöllö tukibotti"
      >
        <Bot className="w-8 h-8 text-white" />
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-6 right-6 w-96 shadow-2xl z-50 border-2 border-blue-200 transition-all ${isMinimized ? 'h-16' : 'h-[600px]'}`}>
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Apu-Pöllö</CardTitle>
              <p className="text-xs text-blue-100">Wilman tukibotti</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="p-4 h-[calc(100%-140px)] overflow-y-auto bg-gray-50">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
                    <div className={`rounded-lg p-3 ${
                      message.sender === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    </div>
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.suggestions.map((suggestion, idx) => (
                          <Button
                            key={idx}
                            size="sm"
                            variant="outline"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full justify-start text-xs h-auto py-2 bg-white hover:bg-blue-50"
                          >
                            <HelpCircle className="w-3 h-3 mr-2 flex-shrink-0" />
                            <span className="text-left">{suggestion}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </CardContent>

          <div className="p-4 border-t bg-white rounded-b-lg">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Kirjoita kysymyksesi..."
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
