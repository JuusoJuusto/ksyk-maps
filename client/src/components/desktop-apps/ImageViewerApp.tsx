import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

export default function ImageViewerApp() {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);

  const sampleImages = [
    "/KSYK-logo-desktop.png",
    "/ksykmaps_logo.png",
    "/kulosaaren_yhteiskoulu_logo.jpeg",
  ];

  const zoomIn = () => setZoom(Math.min(zoom + 10, 200));
  const zoomOut = () => setZoom(Math.max(zoom - 10, 50));
  const rotate = () => setRotation((rotation + 90) % 360);
  const nextImage = () => setSelectedImage((selectedImage + 1) % sampleImages.length);
  const prevImage = () => setSelectedImage((selectedImage - 1 + sampleImages.length) % sampleImages.length);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-2 flex gap-2 items-center">
        <Button size="sm" variant="outline" onClick={prevImage} className="h-8 w-8 p-0">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={nextImage} className="h-8 w-8 p-0">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <div className="border-l border-gray-700 mx-2 h-6" />
        <Button size="sm" variant="outline" onClick={zoomOut} className="h-8 w-8 p-0">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-white text-sm w-12 text-center">{zoom}%</span>
        <Button size="sm" variant="outline" onClick={zoomIn} className="h-8 w-8 p-0">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={rotate} className="h-8 w-8 p-0">
          <RotateCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Image Display */}
      <div className="flex-1 flex items-center justify-center overflow-auto">
        <img
          src={sampleImages[selectedImage]}
          alt="Viewer"
          style={{
            width: `${zoom}%`,
            transform: `rotate(${rotation}deg)`,
            transition: "transform 0.2s",
          }}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 border-t border-gray-700 p-2 text-white text-xs">
        <p>Kuva {selectedImage + 1} / {sampleImages.length}</p>
      </div>
    </div>
  );
}
