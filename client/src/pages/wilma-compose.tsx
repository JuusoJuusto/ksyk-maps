import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Send, User, Paperclip, Save, X } from 'lucide-react';

export default function WilmaCompose() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma/:studentId/compose');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [language, setLanguage] = useState<'fi' | 'en'>('fi');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [saveDraft, setSaveDraft] = useState(false);

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
      alert(language === 'fi' ? 'Täytä kaikki pakolliset kentät!' : 'Fill all required fields!');
      return;
    }

    alert(language === 'fi' 
      ? `✅ Viesti lähetetty!\n\nVastaanottaja: ${recipient}\nAihe: ${subject}\nPrioriteetti: ${priority === 'high' ? 'Kiireellinen' : 'Normaali'}\n\nViestisi on lähetetty onnistuneesti.`
      : `✅ Message sent!\n\nRecipient: ${recipient}\nSubject: ${subject}\nPriority: ${priority === 'high' ? 'Urgent' : 'Normal'}\n\nYour message has been sent successfully.`
    );
    
    setLocation(`/wilma/${params.studentId}/messages`);
  };

  const handleSaveDraft = () => {
    alert(language === 'fi' ? '💾 Luonnos tallennettu!' : '💾 Draft saved!');
  };

  const t = {
    fi: {
      back: 'Takaisin viesteihin',
      compose: 'Lähetä viesti',
      recipient: 'Vastaanottaja',
      subject: 'Aihe',
      message: 'Viesti',
      send: 'Lähetä',
      cancel: 'Peruuta',
      saveDraft: 'Tallenna luonnos',
      recipientPlaceholder: 'Valitse vastaanottaja...',
      subjectPlaceholder: 'Kirjoita aihe...',
      messagePlaceholder: 'Kirjoita viestisi tähän...',
      priority: 'Prioriteetti',
      normal: 'Normaali',
      high: 'Kiireellinen',
      attachments: 'Liitteet',
      addAttachment: 'Lisää liite',
      required: 'Pakollinen',
    },
    en: {
      back: 'Back to messages',
      compose: 'Compose Message',
      recipient: 'Recipient',
      subject: 'Subject',
      message: 'Message',
      send: 'Send',
      cancel: 'Cancel',
      saveDraft: 'Save Draft',
      recipientPlaceholder: 'Select recipient...',
      subjectPlaceholder: 'Enter subject...',
      messagePlaceholder: 'Write your message here...',
      priority: 'Priority',
      normal: 'Normal',
      high: 'Urgent',
      attachments: 'Attachments',
      addAttachment: 'Add Attachment',
      required: 'Required',
    }
  };

  const tr = t[language];

  const teachers = [
    'Opettaja Virtanen (Matematiikka)',
    'Opettaja Korhonen (Äidinkieli)',
    'Opettaja Mäkinen (Englanti)',
    'Opettaja Nieminen (Historia)',
    'Opettaja Laine (Fysiikka)',
    'Opettaja Salo (Kemia)',
    'Rehtori Korhonen',
    'Kuraattori',
    'Terveydenhoitaja',
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header - Wilma Style */}
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

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Button 
          variant="outline" 
          className="mb-4 border-[#003d82] text-[#003d82] hover:bg-[#003d82] hover:text-white"
          onClick={() => setLocation(`/wilma/${params.studentId}/messages`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {tr.back}
        </Button>

        {/* Wilma-style compose form */}
        <Card className="border-2 border-[#003d82] shadow-lg">
          <CardHeader className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white rounded-t-lg">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Send className="w-6 h-6" />
              {tr.compose}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-white">
            <div className="space-y-5">
              {/* Recipient */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  {tr.recipient} <span className="text-red-600">*</span>
                </label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                >
                  <option value="">{tr.recipientPlaceholder}</option>
                  {teachers.map((teacher) => (
                    <option key={teacher} value={teacher}>{teacher}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  {tr.subject} <span className="text-red-600">*</span>
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={tr.subjectPlaceholder}
                  className="w-full text-base border-2 border-gray-300 focus:border-blue-500 py-3"
                />
              </div>

              {/* Priority */}
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  {tr.priority}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value="normal"
                      checked={priority === 'normal'}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700">{tr.normal}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value="high"
                      checked={priority === 'high'}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-red-600 font-semibold">{tr.high}</span>
                  </label>
                </div>
              </div>

              {/* Message */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  {tr.message} <span className="text-red-600">*</span>
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={tr.messagePlaceholder}
                  className="w-full min-h-[300px] text-base border-2 border-gray-300 focus:border-blue-500 p-4"
                />
                <div className="mt-2 text-sm text-gray-600">
                  {message.length} {language === 'fi' ? 'merkkiä' : 'characters'}
                </div>
              </div>

              {/* Attachments */}
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  {tr.attachments}
                </label>
                <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white">
                  <Paperclip className="w-4 h-4 mr-2" />
                  {tr.addAttachment}
                </Button>
                <p className="text-xs text-gray-600 mt-2">
                  {language === 'fi' ? 'Maksimi tiedostokoko: 10 MB' : 'Maximum file size: 10 MB'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                <Button 
                  className="flex-1 bg-[#003d82] hover:bg-[#0052a3] text-white py-4 text-lg font-semibold shadow-lg"
                  onClick={handleSend}
                >
                  <Send className="w-5 h-5 mr-2" />
                  {tr.send}
                </Button>
                <Button 
                  variant="outline"
                  className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-4"
                  onClick={handleSaveDraft}
                >
                  <Save className="w-5 h-5 mr-2" />
                  {tr.saveDraft}
                </Button>
                <Button 
                  variant="outline"
                  className="border-2 border-gray-400 text-gray-600 hover:bg-gray-50 py-4"
                  onClick={() => setLocation(`/wilma/${params.studentId}/messages`)}
                >
                  <X className="w-5 h-5 mr-2" />
                  {tr.cancel}
                </Button>
              </div>

              {/* Help Text */}
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>{language === 'fi' ? 'Huom!' : 'Note!'}</strong>{' '}
                  {language === 'fi' 
                    ? 'Viestit lähetetään vastaanottajan Wilma-tilille. Vastaanottaja saa ilmoituksen uudesta viestistä.'
                    : 'Messages are sent to the recipient\'s Wilma account. The recipient will be notified of the new message.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
