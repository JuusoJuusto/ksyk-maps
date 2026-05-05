import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, BookOpen, Award, TrendingUp } from "lucide-react";

export default function KhanAcademyApp() {
  const courses = [
    { title: "Mathematics", progress: 65, icon: "📐", lessons: 45 },
    { title: "Physics", progress: 40, icon: "⚛️", lessons: 32 },
    { title: "Chemistry", progress: 55, icon: "🧪", lessons: 28 },
    { title: "Biology", progress: 75, icon: "🧬", lessons: 38 },
    { title: "History", progress: 30, icon: "🏛️", lessons: 25 },
    { title: "Programming", progress: 85, icon: "💻", lessons: 50 },
  ];

  return (
    <div className="h-full bg-gradient-to-br from-green-50 to-teal-50 overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Khan Academy</h1>
          <p className="text-gray-600">Learn anything, for free, forever.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="p-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">218</p>
                <p className="text-sm text-gray-600">Lessons Completed</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">15</p>
                <p className="text-sm text-gray-600">Badges Earned</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">7</p>
                <p className="text-sm text-gray-600">Day Streak</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Courses */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Courses</h2>
        <div className="grid grid-cols-2 gap-4">
          {courses.map((course, idx) => (
            <Card key={idx} className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{course.icon}</div>
                  <div>
                    <h3 className="font-bold text-lg">{course.title}</h3>
                    <p className="text-sm text-gray-600">{course.lessons} lessons</p>
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-semibold text-green-600">{course.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4 mr-2" />
                Continue Learning
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
