import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Send, User } from 'lucide-react';

export default function WilmaCompose() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma/:studentId/compose');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [language, setLanguage] = useState<'fi' | 'en'>('fi');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Get replyTo from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const replyTo = urlParams.get('replyTo');
    
    if (replyTo === '1') {
      setRecipient('Opettaja Virtanen');
      setSubject('Re: Kokeen tulokset');
    } else if (replyTo === '2') {
      setRecipient('Rehtori Korhonen');
      setSubject('Re: Kevätjuhla');
    }
  }, []);

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

  if (!match || !currentUser) {
    return null;
  }

  const handleSend = () => {
    if (!recipient || !subject || !message) {
      alert(language === 'fi' ? 'Täytä kaikki kentät!' : 'Fill all fields!');
      return;
    }

    alert(language === 'fi' 
      ? `Viesti lähetetty!\n\nVastaanottaja: ${recipient}\nAihe: ${subject}\n\nViestisi on lähetetty onnistuneesti.`
      : `Message sent!\n\nRecipient: ${recipient}\nSubject: ${subject}\n\nYour message has been sent successfully.`
    );
    
    setLocation(`/wilma/${params.studentId}/messages`);
  };

  const t = {
    fi: {
      back: 'Takaisin',
      compose: 'Lähetä viesti',
      recipient: 'Vastaanottaja',
      subject: 'Aihe',
      message: 'Viesti',
      send: 'Lähetä',
      cancel: 'Peruuta',
      recipientPlaceholder: 'Valitse vastaanottaja...',
      subjectPlaceholder: 'Kirjoita aihe...',
      messagePlaceholder: 'Kirjoita viestisi tähän...',
    },
    en: {
      back: 'Back',
      compose: 'Compose Message',
      recipient: 'Recipient',
      subject: 'Subject',
      message: 'Message',
      send: 'Send',
      cancel: 'Cancel',
      recipientPlaceholder: 'Select recipient...',
      subjectPlaceholder: 'Enter subject...',
      messagePlaceholder: 'Write your message here...',
    }
  };

  const tr = t[language];

  const teachers = [
    'Opettaja Virtanen',
    'Opettaja Korhonen',
    'Opettaja Mäkinen',
    'Opettaja Nieminen',
    'Opettaja Laine',
    'Rehtori Korhonen',
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="bg-[#003d82] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold">Wilma - Brando</h1>
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
            <CardTitle className="text-2xl text-gray-800">{tr.compose}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tr.recipient}
                </label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{tr.recipientPlaceholder}</option>
                  {teachers.map((teacher) => (
                    <option key={teacher} value={teacher}>{teacher}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tr.subject}
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={tr.subjectPlaceholder}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tr.message}
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={tr.messagePlaceholder}
                  className="w-full min-h-[300px]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleSend}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {tr.send}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation(`/wilma/${params.studentId}/messages`)}
                >
                  {tr.cancel}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
