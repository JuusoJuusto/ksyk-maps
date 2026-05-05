import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Play, Edit, Star } from "lucide-react";

export default function QuizletApp() {
  const [flipped, setFlipped] = useState(false);

  const studySets = [
    { title: "Finnish Vocabulary", cards: 50, studied: "2 hours ago" },
    { title: "Math Formulas", cards: 35, studied: "Yesterday" },
    { title: "History Dates", cards: 42, studied: "3 days ago" },
    { title: "Chemistry Elements", cards: 28, studied: "1 week ago" },
  ];

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-indigo-50 overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Quizlet</h1>
            <p className="text-gray-600">Study with flashcards and games</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Set
          </Button>
        </div>

        {/* Flashcard Demo */}
        <Card className="p-8 mb-8 bg-white">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Practice Mode</h2>
          <div
            className="relative w-full aspect-[3/2] cursor-pointer"
            onClick={() => setFlipped(!flipped)}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-2xl flex items-center justify-center transition-transform duration-500 ${
                flipped ? "rotate-y-180" : ""
              }`}
              style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
            >
              <div className="text-center text-white p-8">
                <p className="text-4xl font-bold mb-2">
                  {flipped ? "School" : "Koulu"}
                </p>
                <p className="text-sm opacity-80">
                  {flipped ? "English" : "Finnish"}
                </p>
              </div>
            </div>
          </div>
          <p className="text-center text-gray-600 mt-4">Click card to flip</p>
        </Card>

        {/* Study Sets */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Study Sets</h2>
        <div className="grid grid-cols-2 gap-4">
          {studySets.map((set, idx) => (
            <Card key={idx} className="p-6 bg-white hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg mb-1">{set.title}</h3>
                  <p className="text-sm text-gray-600">{set.cards} cards</p>
                  <p className="text-xs text-gray-500 mt-1">Studied {set.studied}</p>
                </div>
                <Button variant="ghost" size="icon">
                  <Star className="w-5 h-5 text-yellow-500" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" size="sm">
                  <Play className="w-4 h-4 mr-2" />
                  Study
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
