import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Award, Target, TrendingUp } from "lucide-react";

export default function DuolingoApp() {
  const languages = [
    { name: "English", flag: "🇬🇧", progress: 45, streak: 12 },
    { name: "Swedish", flag: "🇸🇪", progress: 30, streak: 5 },
    { name: "German", flag: "🇩🇪", progress: 15, streak: 3 },
  ];

  return (
    <div className="h-full bg-gradient-to-br from-green-400 to-green-600 overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="text-center mb-8 text-white">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🦉</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Duolingo</h1>
          <p className="text-green-100">Learn languages for free, forever</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          <Card className="p-4 bg-white/95">
            <div className="text-center">
              <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">12</p>
              <p className="text-xs text-gray-600">Day Streak</p>
            </div>
          </Card>
          <Card className="p-4 bg-white/95">
            <div className="text-center">
              <Award className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">850</p>
              <p className="text-xs text-gray-600">Total XP</p>
            </div>
          </Card>
          <Card className="p-4 bg-white/95">
            <div className="text-center">
              <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">5/5</p>
              <p className="text-xs text-gray-600">Daily Goal</p>
            </div>
          </Card>
          <Card className="p-4 bg-white/95">
            <div className="text-center">
              <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">#3</p>
              <p className="text-xs text-gray-600">League Rank</p>
            </div>
          </Card>
        </div>

        {/* Languages */}
        <div className="space-y-4">
          {languages.map((lang, idx) => (
            <Card key={idx} className="p-6 bg-white/95 hover:bg-white transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{lang.flag}</div>
                  <div>
                    <h3 className="font-bold text-xl text-gray-800">{lang.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-gray-600">{lang.streak} day streak</span>
                    </div>
                  </div>
                </div>
                <Button className="bg-green-600 hover:bg-green-700 text-white px-8">
                  Continue
                </Button>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-semibold text-green-600">{lang.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all"
                    style={{ width: `${lang.progress}%` }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
