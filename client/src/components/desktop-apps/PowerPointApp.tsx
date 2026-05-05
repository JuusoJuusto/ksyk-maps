import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Play, Download, Image, Type } from "lucide-react";

export default function PowerPointApp() {
  const [slides, setSlides] = useState([
    { title: "Welcome to PowerPoint", content: "Create amazing presentations", bg: "from-blue-500 to-purple-600" },
    { title: "Slide 2", content: "Add your content here", bg: "from-green-500 to-teal-600" },
    { title: "Slide 3", content: "Present with confidence", bg: "from-orange-500 to-red-600" },
  ]);
  const [currentSlide, setCurrentSlide] = useState(0);

  return (
    <div className="h-full flex bg-gray-100">
      {/* Slide Thumbnails */}
      <div className="w-48 bg-white border-r overflow-y-auto p-2">
        <Button size="sm" className="w-full mb-2 bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" />
          New Slide
        </Button>
        {slides.map((slide, idx) => (
          <Card
            key={idx}
            className={`mb-2 cursor-pointer hover:shadow-lg transition-shadow ${
              currentSlide === idx ? "ring-2 ring-orange-500" : ""
            }`}
            onClick={() => setCurrentSlide(idx)}
          >
            <div className={`aspect-video bg-gradient-to-br ${slide.bg} p-2 text-white text-xs`}>
              <div className="font-bold">{slide.title}</div>
              <div className="text-[10px] mt-1">{slide.content}</div>
            </div>
            <div className="p-1 text-center text-xs text-gray-600">{idx + 1}</div>
          </Card>
        ))}
      </div>

      {/* Main Slide View */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="border-b p-2 flex items-center gap-2 bg-white">
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
            <Play className="w-4 h-4 mr-2" />
            Present
          </Button>
          <Button size="sm" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <div className="border-l h-6 mx-2" />
          <Button size="sm" variant="outline">
            <Type className="w-4 h-4 mr-2" />
            Text
          </Button>
          <Button size="sm" variant="outline">
            <Image className="w-4 h-4 mr-2" />
            Image
          </Button>
        </div>

        {/* Slide Canvas */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-4xl aspect-video bg-white shadow-2xl rounded-lg overflow-hidden">
            <div className={`w-full h-full bg-gradient-to-br ${slides[currentSlide].bg} flex flex-col items-center justify-center text-white p-12`}>
              <h1 className="text-5xl font-bold mb-6 text-center">{slides[currentSlide].title}</h1>
              <p className="text-2xl text-center">{slides[currentSlide].content}</p>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="border-t p-2 bg-white flex items-center justify-between text-xs text-gray-600">
          <div>Slide {currentSlide + 1} of {slides.length}</div>
          <div>16:9 Format</div>
        </div>
      </div>
    </div>
  );
}
