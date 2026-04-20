import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, Send, Inbox, Trash2, Search, Plus, X, 
  User, Clock, CheckCircle, AlertCircle 
} from "lucide-react";

export default function WilmaMessagesManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("inbox");
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  
  // Compose form state
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["wilma-messages"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/messages");
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await fetch("/api/wilma/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData)
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wilma-messages"] });
      alert("✅ Viesti lähetetty onnistuneesti!");
      setShowCompose(false);
      setRecipient("");
      setSubject("");
      setMessage("");
    },
    onError: () => {
      alert("❌ Viestin lähetys epäonnistui");
    }
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/messages/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error("Failed to delete message");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wilma-messages"] });
      setSelectedMessage(null);
      alert("✅ Viesti poistettu");
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/messages/${id}/read`, {
        method: "PUT"
      });
      if (!response.ok) throw new Error("Failed to mark as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wilma-messages"] });
    }
  });

  const handleSendMessage = () => {
    if (!recipient || !subject || !message) {
      alert("Täytä kaikki kentät");
      return;
    }

    sendMessageMutation.mutate({
      recipient,
      subject,
      message,
      sentAt: new Date().toISOString()
    });
  };

  const filteredMessages = messages.filter((msg: any) =>
    `${msg.subject} ${msg.sender} ${msg.message}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const inboxMessages = filteredMessages.filter((msg: any) => !msg.sent);
  const sentMessages = filteredMessages.filter((msg: any) => msg.sent);
  const unreadCount = inboxMessages.filter((msg: any) => !msg.read).length;

  if (showCompose) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Uusi viesti</h2>
          <Button variant="outline" onClick={() => setShowCompose(false)}>
            <X className="w-4 h-4 mr-2" />
            Peruuta
          </Button>
        </div>

        <Card className="border-2 border-blue-200">
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Vastaanottaja</Label>
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Syötä sähköpostiosoite"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Aihe</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Viestin aihe"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Viesti</Label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Kirjoita viestisi tähän..."
                className="w-full border rounded-md px-3 py-2 mt-1 min-h-[200px]"
              />
            </div>

            <Button
              onClick={handleSendMessage}
              disabled={sendMessageMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendMessageMutation.isPending ? "Lähetetään..." : "Lähetä viesti"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedMessage) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setSelectedMessage(null)}>
            <X className="w-4 h-4 mr-2" />
            Takaisin
          </Button>
          <Button
            variant="outline"
            className="text-red-600"
            onClick={() => deleteMessageMutation.mutate(selectedMessage.id)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Poista
          </Button>
        </div>

        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-xl">{selectedMessage.subject}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {selectedMessage.sender}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {new Date(selectedMessage.sentAt).toLocaleString('fi-FI')}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
            </div>

            <div className="mt-6 pt-6 border-t">
              <Button
                onClick={() => {
                  setRecipient(selectedMessage.sender);
                  setSubject(`Re: ${selectedMessage.subject}`);
                  setShowCompose(true);
                  setSelectedMessage(null);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Vastaa
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-2xl font-bold">Viestit</h2>
        <div className="flex gap-2">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Hae viestejä..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-64"
            />
          </div>
          <Button
            onClick={() => setShowCompose(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Uusi viesti
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border-2 border-gray-200">
          <TabsTrigger value="inbox" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Inbox className="w-4 h-4 mr-2" />
            Saapuneet ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="sent" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
            <Send className="w-4 h-4 mr-2" />
            Lähetetyt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Ladataan viestejä...</p>
            </div>
          ) : inboxMessages.length === 0 ? (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-12 text-center">
                <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Ei viestejä</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {inboxMessages.map((msg: any) => (
                <Card
                  key={msg.id}
                  className={`cursor-pointer hover:shadow-lg transition-shadow border-2 ${
                    msg.read ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'
                  }`}
                  onClick={() => {
                    setSelectedMessage(msg);
                    if (!msg.read) {
                      markAsReadMutation.mutate(msg.id);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {!msg.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                          <p className={`font-semibold truncate ${!msg.read ? 'text-blue-900' : 'text-gray-900'}`}>
                            {msg.subject}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <User className="w-3 h-3" />
                          {msg.sender}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {msg.message}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 ml-4 flex-shrink-0">
                        {new Date(msg.sentAt).toLocaleDateString('fi-FI')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          {sentMessages.length === 0 ? (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-12 text-center">
                <Send className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Ei lähetetty viestejä</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sentMessages.map((msg: any) => (
                <Card
                  key={msg.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-gray-200"
                  onClick={() => setSelectedMessage(msg)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-gray-900">
                          {msg.subject}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                          <User className="w-3 h-3" />
                          Vastaanottaja: {msg.recipient}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {msg.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-gray-500">
                          {new Date(msg.sentAt).toLocaleDateString('fi-FI')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
