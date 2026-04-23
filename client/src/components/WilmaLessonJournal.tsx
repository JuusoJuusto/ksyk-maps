import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BookOpen, Calendar, Users, FileText, Plus, Save } from "lucide-react";

interface JournalEntry {
  id: string;
  date: string;
  course: string;
  topic: string;
  content: string;
  homework: string;
  attendance: string;
  notes: string;
}

export default function WilmaLessonJournal() {
  const [isCreating, setIsCreating] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    course: "",
    topic: "",
    content: "",
    homework: "",
    attendance: "",
    notes: "",
  });

  // Mock data
  const entries: JournalEntry[] = [
    {
      id: "1",
      date: "22.04.2026",
      course: "Matematiikka 9A",
      topic: "Toisen asteen yhtälöt",
      content: "Käytiin läpi toisen asteen yhtälöiden ratkaiseminen. Opiskelijat harjoittelivat ratkaisukaavaa ja graafista esitystä.",
      homework: "Tehtävät 45-47, sivut 120-122",
      attendance: "Läsnä: 24/25. Poissa: Matti Meikäläinen (sairaana)",
      notes: "Hyvä osallistuminen. Muutama opiskelija tarvitsee lisätukea.",
    },
    {
      id: "2",
      date: "21.04.2026",
      course: "Matematiikka 9A",
      topic: "Ensimmäisen asteen yhtälöt - kertaus",
      content: "Kertasimme ensimmäisen asteen yhtälöitä ennen uuden aiheen aloittamista. Tehtiin harjoituksia yhdessä.",
      homework: "Ei kotitehtäviä",
      attendance: "Läsnä: 25/25",
      notes: "Kaikki osallistuivat aktiivisesti.",
    },
  ];

  const handleSave = () => {
    console.log("Saving entry:", newEntry);
    setIsCreating(false);
    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      course: "",
      topic: "",
      content: "",
      homework: "",
      attendance: "",
      notes: "",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-[#dddddd]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#003d82]" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">Tuntipäiväkirja</h2>
                <p className="text-sm text-gray-600">Kirjaa oppituntien sisältö ja kotitehtävät</p>
              </div>
            </div>
            <Button
              onClick={() => setIsCreating(!isCreating)}
              className="bg-[#003d82] hover:bg-[#002d5f]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Uusi merkintä
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create New Entry Form */}
      {isCreating && (
        <Card className="border-[#dddddd]">
          <CardHeader className="p-4 bg-[#003d82] text-white">
            <CardTitle className="text-base">Uusi tuntimerkintä</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Päivämäärä
                </label>
                <Input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  className="border-[#dddddd]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kurssi
                </label>
                <Input
                  placeholder="esim. Matematiikka 9A"
                  value={newEntry.course}
                  onChange={(e) => setNewEntry({ ...newEntry, course: e.target.value })}
                  className="border-[#dddddd]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tunnin aihe
              </label>
              <Input
                placeholder="esim. Toisen asteen yhtälöt"
                value={newEntry.topic}
                onChange={(e) => setNewEntry({ ...newEntry, topic: e.target.value })}
                className="border-[#dddddd]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tunnin sisältö
              </label>
              <Textarea
                placeholder="Mitä tunnilla käsiteltiin..."
                value={newEntry.content}
                onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                rows={4}
                className="border-[#dddddd]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kotitehtävät
              </label>
              <Textarea
                placeholder="Annetut kotitehtävät..."
                value={newEntry.homework}
                onChange={(e) => setNewEntry({ ...newEntry, homework: e.target.value })}
                rows={2}
                className="border-[#dddddd]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Läsnäolo
              </label>
              <Input
                placeholder="esim. Läsnä: 24/25"
                value={newEntry.attendance}
                onChange={(e) => setNewEntry({ ...newEntry, attendance: e.target.value })}
                className="border-[#dddddd]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Muistiinpanot
              </label>
              <Textarea
                placeholder="Lisähuomiot, käyttäytyminen, jne..."
                value={newEntry.notes}
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                rows={2}
                className="border-[#dddddd]"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                className="bg-[#003d82] hover:bg-[#002d5f]"
              >
                <Save className="w-4 h-4 mr-2" />
                Tallenna
              </Button>
              <Button
                onClick={() => setIsCreating(false)}
                variant="outline"
              >
                Peruuta
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Journal Entries */}
      <div className="space-y-3">
        {entries.map((entry) => (
          <Card key={entry.id} className="border-[#dddddd]">
            <CardHeader className="p-4 bg-gray-50 border-b border-[#dddddd]">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900">
                    {entry.course}
                  </CardTitle>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{entry.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>{entry.topic}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Muokkaa
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Tunnin sisältö:</h4>
                <p className="text-sm text-gray-600">{entry.content}</p>
              </div>

              {entry.homework && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Kotitehtävät:</h4>
                  <p className="text-sm text-gray-600">{entry.homework}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Läsnäolo:
                  </h4>
                  <p className="text-sm text-gray-600">{entry.attendance}</p>
                </div>

                {entry.notes && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Muistiinpanot:</h4>
                    <p className="text-sm text-gray-600">{entry.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
