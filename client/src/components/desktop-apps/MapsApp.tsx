import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Navigation, MapPin, Star } from "lucide-react";

export default function MapsApp() {
  const [search, setSearch] = useState("");

  const places = [
    { name: "School", address: "Kulosaari, Helsinki", type: "🏫" },
    { name: "Library", address: "City Center", type: "📚" },
    { name: "Sports Center", address: "East Helsinki", type: "⚽" },
    { name: "Cafe", address: "Near School", type: "☕" },
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Search Bar */}
      <div className="p-4 border-b">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for places..."
              className="pl-10"
            />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Navigation className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green-200 via-blue-200 to-green-300 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-16 h-16 text-red-600 mx-auto mb-4 animate-bounce" />
            <p className="text-2xl font-bold text-gray-700">Helsinki, Finland</p>
            <p className="text-gray-600">Kulosaaren Yhteiskoulu</p>
          </div>
        </div>

        {/* Saved Places Panel */}
        <div className="absolute top-4 left-4 w-80">
          <Card className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Saved Places
            </h3>
            <div className="space-y-2">
              {places.map((place, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{place.type}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{place.name}</h4>
                      <p className="text-xs text-gray-600">{place.address}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-4 border-t flex justify-center gap-4">
        <Button variant="outline">
          <MapPin className="w-4 h-4 mr-2" />
          Directions
        </Button>
        <Button variant="outline">
          <Star className="w-4 h-4 mr-2" />
          Save Place
        </Button>
        <Button variant="outline">
          <Navigation className="w-4 h-4 mr-2" />
          Navigate
        </Button>
      </div>
    </div>
  );
}
