import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, CheckCircle, Clock, AlertCircle, HelpCircle, Bot } from "lucide-react";
import SupportBot from "./SupportBot";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  category: string;
  createdAt: string;
  updatedAt: string;
}

export default function WilmaSupportTab() {
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    category: 'technical',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  // Mock tickets
  const [tickets] = useState<Ticket[]>([
    {
      id: '1',
      title: 'Lukujärjestys ei näy oikein',
      description: 'En näe kaikkia tuntejani lukujärjestyksessä',
      status: 'in_progress',
      priority: 'medium',
      category: 'technical',
      createdAt: '2026-04-20T10:00:00Z',
      updatedAt: '2026-04-21T14:30:00Z'
    },
    {
      id: '2',
      title: 'Salasanan vaihto',
      description: 'Tarvitsen apua salasanan vaihtamisessa',
      status: 'resolved',
      priority: 'low',
      category: 'account',
      createdAt: '2026-04-18T09:00:00Z',
      updatedAt: '2026-04-19T11:00:00Z'
    }
  ]);

  const handleSubmitTicket = () => {
    // TODO: Implement ticket creation
    console.log('Creating ticket:', newTicket);
    setShowNewTicket(false);
    setNewTicket({ title: '', description: '', category: 'technical', priority: 'medium' });
  };

  const getStatusIcon = (status: Ticket['status']) => {
    switch (status) {
      case 'open': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <AlertCircle className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      case 'closed': return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: Ticket['status']) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Ticket['priority']) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Support Bot */}
      <SupportBot />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tuki ja Palaute</h2>
          <p className="text-gray-600 mt-1">Lähetä tukipyyntö tai anna palautetta</p>
        </div>
        <Button onClick={() => setShowNewTicket(!showNewTicket)} className="bg-[#003d82] hover:bg-[#0052a3]">
          <MessageSquare className="w-4 h-4 mr-2" />
          Uusi tukipyyntö
        </Button>
      </div>

      {/* Bot Info Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 mb-1">Kokeile Apu-Pöllö tukibottia! 🦉</h3>
              <p className="text-sm text-gray-700 mb-3">
                Apu-Pöllö on ystävällinen tukibotti, joka voi auttaa sinua yleisimmissä kysymyksissä välittömästi. 
                Klikkaa oikeassa alakulmassa olevaa sinistä nappia avataksesi keskustelun!
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-white">Nopeat vastaukset</Badge>
                <Badge variant="outline" className="bg-white">24/7 saatavilla</Badge>
                <Badge variant="outline" className="bg-white">Suomenkielinen</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Ticket Form */}
      {showNewTicket && (
        <Card className="border-2 border-[#003d82]">
          <CardHeader className="bg-[#003d82] text-white">
            <CardTitle>Uusi tukipyyntö</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Otsikko</Label>
              <Input
                value={newTicket.title}
                onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                placeholder="Lyhyt kuvaus ongelmasta"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Kuvaus</Label>
              <Textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                placeholder="Kerro tarkemmin ongelmasta tai kysymyksestä"
                rows={4}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kategoria</Label>
                <select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="technical">Tekninen ongelma</option>
                  <option value="account">Käyttäjätili</option>
                  <option value="grades">Arvosanat</option>
                  <option value="schedule">Lukujärjestys</option>
                  <option value="other">Muu</option>
                </select>
              </div>

              <div>
                <Label>Kiireellisyys</Label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="low">Matala</option>
                  <option value="medium">Keskitaso</option>
                  <option value="high">Korkea</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmitTicket} className="bg-[#003d82] hover:bg-[#0052a3]">
                <Send className="w-4 h-4 mr-2" />
                Lähetä
              </Button>
              <Button onClick={() => setShowNewTicket(false)} variant="outline">
                Peruuta
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#003d82]" />
            Usein kysytyt kysymykset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { q: 'Miten vaihdan salasanani?', a: 'Mene Asetukset-välilehdelle ja valitse "Vaihda salasana".' },
            { q: 'En näe kaikkia arvosanojani', a: 'Arvosanat päivittyvät automaattisesti kun opettaja on syöttänyt ne.' },
            { q: 'Miten lähetän viestin opettajalle?', a: 'Mene Viestit-välilehdelle ja valitse "Uusi viesti".' },
          ].map((faq, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold text-gray-800">{faq.q}</p>
              <p className="text-sm text-gray-600 mt-1">{faq.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* My Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Omat tukipyynnöt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tickets.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Ei tukipyyntöjä</p>
          ) : (
            tickets.map((ticket) => (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-800">{ticket.title}</h3>
                        <Badge className={getStatusColor(ticket.status)}>
                          {getStatusIcon(ticket.status)}
                          <span className="ml-1">
                            {ticket.status === 'open' && 'Avoin'}
                            {ticket.status === 'in_progress' && 'Käsittelyssä'}
                            {ticket.status === 'resolved' && 'Ratkaistu'}
                            {ticket.status === 'closed' && 'Suljettu'}
                          </span>
                        </Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority === 'low' && 'Matala'}
                          {ticket.priority === 'medium' && 'Keskitaso'}
                          {ticket.priority === 'high' && 'Korkea'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{ticket.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Luotu: {new Date(ticket.createdAt).toLocaleDateString('fi-FI')}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Näytä
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
