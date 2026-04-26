import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, User, Calendar, Reply, Trash2 } from 'lucide-react';

export default function WilmaMessage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma/:studentId/message/:messageId');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [language, setLanguage] = useState<'fi' | 'en'>('fi');

  // Mock messages database
  const allMessages = [
    { 
      id: '1', 
      from: 'Opettaja Virtanen', 
      subject: 'Kokeen tulokset', 
      date: '2026-04-08', 
      unread: true,
      content: 'Hei,\n\nMatematiikan kokeen tulokset on nyt julkaistu. Sait arvosanaksi 9/10. Hyvää työtä!\n\nKoe meni kokonaisuudessaan hyvin. Erityisesti trigonometrian tehtävät olivat hyvin ratkaistu.\n\nJos haluat käydä läpi koetta tarkemmin, voit tulla tapaamaan minua toimistolleni (Luokka 301) koulupäivän jälkeen.\n\nYstävällisin terveisin,\nMatti Virtanen\nMatematiikan opettaja'
    },
    { 
      id: '2', 
      from: 'Rehtori Korhonen', 
      subject: 'Kevätjuhla', 
      date: '2026-04-05', 
      unread: false,
      content: 'Hyvät oppilaat,\n\nKoulumme kevätjuhla järjestetään 15.5.2026 klo 18:00 koulun auditoriossa.\n\nOhjelmassa:\n- Tervehdyssanat\n- Musiikkiesityksiä\n- Palkitsemiset\n- Kahvitarjoilu\n\nToivotamme kaikki oppilaat ja heidän perheensä lämpimästi tervetulleiksi!\n\nYstävällisin terveisin,\nAnna Korhonen\nRehtori'
    },
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem('wilma_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch {
        setLocation('/wilma');
      }
    } else {
      setLocation('/wilma');
    }
  }, []);

  if (!match || !params?.messageId || !currentUser) {
    return null;
  }

  const message = allMessages.find(m => m.id === params.messageId);

  if (!message) {
    setLocation(`/wilma/${params.studentId}/messages`);
    return null;
  }

  const t = {
    fi: {
      back: 'Takaisin viesteihin',
      reply: 'Vastaa',
      delete: 'Poista',
      from: 'Lähettäjä',
      date: 'Päivämäärä',
      unread: 'Lukematon',
      read: 'Luettu',
    },
    en: {
      back: 'Back to messages',
      reply: 'Reply',
      delete: 'Delete',
      from: 'From',
      date: 'Date',
      unread: 'Unread',
      read: 'Read',
    }
  };

  const tr = t[language];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="bg-[#003d82] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold">Wilma - Kulosaaren yhteiskoulu</h1>
              <p className="text-sm text-blue-200">
                <User className="w-4 h-4 inline mr-1" />
                {currentUser.firstName} {currentUser.lastName}
              </p>
            </div>
            <button 
              onClick={() => setLanguage(language === 'fi' ? 'en' : 'fi')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors"
            >
              {language === 'fi' ? 'EN' : 'FI'}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Button 
          variant="outline" 
          className="mb-4"
          onClick={() => setLocation(`/wilma/${params.studentId}/messages`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {tr.back}
        </Button>

        <Card>
          <CardHeader className="bg-[#e8f0f8] border-b border-gray-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl text-gray-800 mb-2">{message.subject}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{tr.from}: <strong>{message.from}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{message.date}</span>
                  </div>
                </div>
              </div>
              {message.unread && (
                <Badge className="bg-[#003d82] text-white">{tr.unread}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {message.content}
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setLocation(`/wilma/${params.studentId}/compose?replyTo=${message.id}`)}
              >
                <Reply className="w-4 h-4 mr-2" />
                {tr.reply}
              </Button>
              <Button 
                variant="outline" 
                className="border-red-600 text-red-600 hover:bg-red-50"
                onClick={() => {
                  if (confirm(language === 'fi' ? 'Haluatko varmasti poistaa tämän viestin?' : 'Are you sure you want to delete this message?')) {
                    alert(language === 'fi' ? 'Viesti poistettu!' : 'Message deleted!');
                    setLocation(`/wilma/${params.studentId}/messages`);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {tr.delete}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
