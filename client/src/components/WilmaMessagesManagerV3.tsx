import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Mail, Send, Inbox, Trash2, Search, Plus, X, 
  User, Clock, CheckCircle, AlertCircle, Users, ChevronDown, ChevronUp
} from "lucide-react";

export default function WilmaMessagesManagerV3() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("inbox");
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  
  // Compose form state
  const [recipientType, setRecipientType] = useState<"student" | "parent" | "teacher" | "class" | "all">("student");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [showRecipientList, setShowRecipientList] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");

  // Fetch all users for recipient selection
  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/users?role=student");
      if (!response.ok) return [];
      return response.json();
    }
  });

  const { data: parents = [] } = useQuery({
    queryKey: ["parents"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/users?role=parent");
      if (!response.ok) return [];
      return response.json();
    }
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/users?role=teacher");
      if (!response.ok) return [];
      return response.json();
    }
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["wilma-classes"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/classes");
      if (!response.ok) return [];
      return response.json();
    }
  });

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
      alert(`✅ Viesti lähetetty ${selectedRecipients.length} vastaanottajalle!`);
      resetCompose();
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

  const resetCompose = () => {
    setShowCompose(false);
    setSelectedRecipients([]);
    setSelectedClass("");
    setSubject("");
    setMessage("");
    setRecipientType("student");
    setShowRecipientList(false);
    setRecipientSearch("");
  };

  const handleSendMessage = () => {
    if (selectedRecipients.length === 0 || !subject || !message) {
      alert("Valitse vastaanottajat ja täytä kaikki kentät");
      return;
    }

    // Send message to each recipient
    const allUsers = [...students, ...parents, ...teachers];
    selectedRecipients.forEach(recipientId => {
      const recipient = allUsers.find(u => u.id === recipientId);
      if (recipient) {
        sendMessageMutation.mutate({
          to: recipient.email,
          toName: `${recipient.firstName} ${recipient.lastName}`,
          subject,
          body: message,
          from: "admin@ksyk.fi",
          fromName: "Wilma Admin",
          isRead: false,
          sentAt: new Date().toISOString()
        });
      }
    });
  };

  const toggleRecipient = (id: string) => {
    setSelectedRecipients(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const allUsers = getRecipientList();
    setSelectedRecipients(allUsers.map(u => u.id));
  };

  const deselectAll = () => {
    setSelectedRecipients([]);
  };

  const getRecipientList = () => {
    let list: any[] = [];
    
    if (recipientType === "student") {
      list = students;
    } else if (recipientType === "parent") {
      list = parents;
    } else if (recipientType === "teacher") {
      list = teachers;
    } else if (recipientType === "class" && selectedClass) {
      list = students.filter((s: any) => s.class === selectedClass || s.studentClass === selectedClass);
    } else if (recipientType === "all") {
      list = [...students, ...parents, ...teachers];
    }

    // Filter by search
    if (recipientSearch) {
      const search = recipientSearch.toLowerCase();
      list = list.filter((u: any) =>
        `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search)
      );
    }

    return list;
  };

  const filteredMessages = messages.filter((msg: any) =>
    `${msg.subject} ${msg.fromName} ${msg.toName} ${msg.body}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const inboxMessages = filteredMessages.filter((msg: any) => msg.to !== "admin@ksyk.fi");
  const sentMessages = filteredMessages.filter((msg: any) => msg.from === "admin@ksyk.fi");
  const unreadCount = inboxMessages.filter((msg: any) => !msg.isRead).length;

  if (showCompose) {
    const recipientList = getRecipientList();
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Send className="w-6 h-6 text-blue-600" />
            Uusi viesti
          </h2>
          <Button variant="outline" onClick={resetCompose}>
            <X className="w-4 h-4 mr-2" />
            Peruuta
          </Button>
        </div>

        <Card className="border-2 border-blue-200 shadow-lg">
          <CardContent className="p-6 space-y-4">
            {/* Recipient Type Selection */}
            <div>
              <Label className="text-base font-semibold mb-2 block">Vastaanottajat</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { value: "student", label: "Opiskelijat", icon: User },
                  { value: "parent", label: "Huoltajat", icon: Users },
                  { value: "teacher", label: "Opettajat", icon: User },
                  { value: "class", label: "Luokka", icon: Users },
                  { value: "all", label: "Kaikki", icon: Users }
                ].map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={recipientType === value ? "default" : "outline"}
                    className={recipientType === value ? "bg-blue-600" : ""}
                    onClick={() => {
                      setRecipientType(value as any);
                      setSelectedRecipients([]);
                      setSelectedClass("");
                    }}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Class Selection (if class type selected) */}
            {recipientType === "class" && (
              <div>
                <Label>Valitse luokka</Label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2">
                  {classes.map((cls: any) => (
                    <Button
                      key={cls.id}
                      type="button"
                      variant={selectedClass === cls.name ? "default" : "outline"}
                      className={selectedClass === cls.name ? "bg-indigo-600" : ""}
                      onClick={() => {
                        setSelectedClass(cls.name);
                        setSelectedRecipients([]);
                      }}
                    >
                      {cls.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Recipient Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">
                  Valitut vastaanottajat ({selectedRecipients.length})
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={selectAll}
                  >
                    Valitse kaikki
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={deselectAll}
                  >
                    Tyhjennä
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRecipientList(!showRecipientList)}
                  >
                    {showRecipientList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {showRecipientList && (
                <div className="border-2 border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <Input
                    placeholder="Hae vastaanottajia..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="mb-3"
                  />
                  
                  <div className="space-y-2">
                    {recipientList.map((user: any) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => toggleRecipient(user.id)}
                      >
                        <Checkbox
                          checked={selectedRecipients.includes(user.id)}
                          onCheckedChange={() => toggleRecipient(user.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-600">{user.email}</p>
                        </div>
                        {user.class || user.studentClass ? (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {user.class || user.studentClass}
                          </span>
                        ) : null}
                      </div>
                    ))}
                    {recipientList.length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        Ei vastaanottajia
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Subject */}
            <div>
              <Label>Aihe</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Viestin aihe"
                className="mt-1"
              />
            </div>

            {/* Message */}
            <div>
              <Label>Viesti</Label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Kirjoita viestisi tähän..."
                className="w-full border-2 border-gray-200 rounded-md px-3 py-2 mt-1 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Send Button */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending || selectedRecipients.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {sendMessageMutation.isPending 
                  ? "Lähetetään..." 
                  : `Lähetä viesti (${selectedRecipients.length} vastaanottajaa)`}
              </Button>
              <Button
                variant="outline"
                onClick={resetCompose}
              >
                Peruuta
              </Button>
            </div>
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
            className="text-red-600 hover:bg-red-50"
            onClick={() => deleteMessageMutation.mutate(selectedMessage.id)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Poista
          </Button>
        </div>

        <Card className="border-2 border-blue-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-xl">{selectedMessage.subject}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {selectedMessage.fromName || selectedMessage.from}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(selectedMessage.sentAt).toLocaleString('fi-FI')}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="whitespace-pre-wrap">{selectedMessage.body}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="w-6 h-6 text-blue-600" />
          Viestit
        </h2>
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
          <Button onClick={() => setShowCompose(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Uusi viesti
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border-2 border-gray-200">
          <TabsTrigger value="inbox" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Inbox className="w-4 h-4 mr-2" />
            Saapuneet {unreadCount > 0 && `(${unreadCount})`}
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
              <CardContent className="p-12 text-center text-gray-500">
                <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Ei viestejä</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {inboxMessages.map((msg: any) => (
                <Card
                  key={msg.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${
                    msg.isRead ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'
                  }`}
                  onClick={() => {
                    setSelectedMessage(msg);
                    if (!msg.isRead) {
                      markAsReadMutation.mutate(msg.id);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {!msg.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                          <p className="font-semibold truncate">{msg.subject}</p>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <User className="w-3 h-3" />
                          {msg.fromName || msg.from}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{msg.body}</p>
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
              <CardContent className="p-12 text-center text-gray-500">
                <Send className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Ei lähetetty viestejä</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sentMessages.map((msg: any) => (
                <Card
                  key={msg.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-2 border-gray-200"
                  onClick={() => setSelectedMessage(msg)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{msg.subject}</p>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <User className="w-3 h-3" />
                          Vastaanottaja: {msg.toName || msg.to}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{msg.body}</p>
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
      </Tabs>
    </div>
  );
}
