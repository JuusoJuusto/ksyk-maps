import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Calendar, Leaf, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface MenuItem {
  date: string;
  dayName: string;
  vegetarian: string;
  regular: string;
  dessert?: string;
}

export default function WilmaLunchMenu() {
  const today = new Date();
  const currentDay = today.getDay();
  const isWeekend = currentDay === 0 || currentDay === 6;

  // Fetch and parse XML lunch menu data (same as main lunch page)
  const { data: menuItems, isLoading, error, refetch } = useQuery({
    queryKey: ['lunch-menu'],
    queryFn: async () => {
      const response = await fetch('/api/lunch-menu');
      if (!response.ok) throw new Error('Failed to fetch menu');
      const text = await response.text();
      
      // Parse XML
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const items = xml.querySelectorAll("item");
      const parsedMenu: MenuItem[] = [];

      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const title = item.querySelector("title")?.textContent || "";
        const description = item.querySelector("description")?.textContent || "";
        const dayName = title.split(",")[0] || "";

        const lines = description
          .split("<br>")
          .map(line => line.replace(/<[^>]*>/g, "").trim())
          .filter(line => line.length > 0);

        let vegetarian = "";
        let regular = "";
        let dessert = "";

        lines.forEach(line => {
          if (line.includes("Kasvislounas:")) {
            vegetarian = line.replace("Kasvislounas:", "").trim();
          } else if (line.includes("Lounas:")) {
            regular = line.replace("Lounas:", "").trim();
          } else if (line.includes("Jälkiruoka:")) {
            dessert = line.replace("Jälkiruoka:", "").trim();
          }
        });

        parsedMenu.push({
          date: title,
          dayName,
          vegetarian: vegetarian || "Ei saatavilla",
          regular: regular || "Ei saatavilla",
          dessert
        });
      }

      return parsedMenu;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: 2
  });

  const parsedMenu = menuItems || [];

  // Find today's index
  const todayIndex = parsedMenu.findIndex(item => {
    const dateMatch = item.date.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (dateMatch) {
      const itemDate = new Date(
        parseInt(dateMatch[3]),
        parseInt(dateMatch[2]) - 1,
        parseInt(dateMatch[1])
      );
      return itemDate.toDateString() === today.toDateString();
    }
    return false;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#003d82] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ladataan ruokalistaa...</p>
        </div>
      </div>
    );
  }

  if (error || !parsedMenu || parsedMenu.length === 0) {
    return (
      <Card className="border-2 border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-800 font-semibold">Ruokalistan lataus epäonnistui</p>
          <p className="text-sm text-red-700 mt-2">Yritä myöhemmin uudelleen</p>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="mt-4 border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Yritä uudelleen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ruokalista</h2>
          <p className="text-sm text-gray-600">Amica - Kulis</p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Päivitä
        </Button>
      </div>

      {/* Weekend Notice */}
      {isWeekend && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-blue-800 font-medium">Ravintola on suljettu viikonloppuisin</p>
          </CardContent>
        </Card>
      )}

      {/* Today's Menu - Compact */}
      {!isWeekend && todayIndex >= 0 && parsedMenu[todayIndex] && (
        <Card className="border-2 border-[#003d82] shadow-md">
          <CardHeader className="bg-[#003d82] text-white py-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Tänään - {parsedMenu[todayIndex].dayName}</span>
              <Calendar className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Leaf className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-green-700">Kasvislounas</p>
                  <p className="text-sm text-gray-800">{parsedMenu[todayIndex].vegetarian}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <UtensilsCrossed className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-700">Lounas</p>
                  <p className="text-sm text-gray-800">{parsedMenu[todayIndex].regular}</p>
                </div>
              </div>

              {parsedMenu[todayIndex].dessert && (
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">🍰</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-pink-700">Jälkiruoka</p>
                    <p className="text-sm text-gray-800">{parsedMenu[todayIndex].dessert}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Menu - Compact List */}
      <Card>
        <CardHeader className="bg-gray-50 border-b py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Viikon ruokalista
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {parsedMenu.map((item, index) => {
              const isToday = index === todayIndex;

              return (
                <div 
                  key={index} 
                  className={`p-4 transition-colors ${
                    isToday ? 'bg-blue-50 border-l-4 border-[#003d82]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-gray-900">
                      {item.dayName}
                    </h4>
                    {isToday && (
                      <span className="text-xs bg-[#003d82] text-white px-2 py-0.5 rounded-full font-medium">
                        Tänään
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-start gap-2">
                      <Leaf className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700 text-xs leading-relaxed">{item.vegetarian}</p>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700 text-xs leading-relaxed">{item.regular}</p>
                    </div>

                    {item.dessert && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm mt-0.5">🍰</span>
                        <p className="text-gray-700 text-xs leading-relaxed">{item.dessert}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <p className="text-xs text-gray-600 text-center">
            Ruokalista tarjoaa Amica / Compass Group Finland
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
