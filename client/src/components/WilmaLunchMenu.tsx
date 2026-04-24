import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, ExternalLink, Calendar, Leaf, AlertCircle, Loader2, RefreshCw } from "lucide-react";
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
  const weekdays = ['Sunnuntai', 'Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai'];
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
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

  if (error || !parsedMenu || parsedMenu.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Lounaslista</h2>
            <p className="text-gray-600 mt-1">Amica - Kulis</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Päivitä
            </Button>
            <Button
              onClick={() => window.open('https://ksyk.fi', '_blank')}
              className="bg-[#003d82] hover:bg-[#0052a3] flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Koulun sivuille
            </Button>
          </div>
        </div>
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-800 font-semibold">Ruokalistan lataus epäonnistui</p>
            <p className="text-sm text-red-700 mt-2">Yritä myöhemmin uudelleen</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with School Link */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Lounaslista</h2>
          <p className="text-gray-600 mt-1">Amica - Kulis</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Päivitä
          </Button>
          <Button
            onClick={() => window.open('https://ksyk.fi', '_blank')}
            className="bg-[#003d82] hover:bg-[#0052a3] flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Koulun sivuille
          </Button>
        </div>
      </div>

      {/* Weekend Notice */}
      {isWeekend && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-6 text-center">
            <Calendar className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <p className="text-blue-800 font-semibold">Ravintola on suljettu viikonloppuisin</p>
            <p className="text-sm text-blue-700 mt-2">Ruokalista on saatavilla maanantaista perjantaihin</p>
          </CardContent>
        </Card>
      )}

      {/* Today's Menu - Highlighted */}
      {!isWeekend && todayIndex >= 0 && parsedMenu[todayIndex] && (
        <Card className="border-4 border-orange-500 shadow-2xl bg-gradient-to-br from-orange-50 to-yellow-50">
          <CardHeader className="bg-orange-500 text-white">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Tänään
              </span>
              <span className="bg-white text-orange-600 text-sm px-3 py-1 rounded-full font-bold">
                {parsedMenu[todayIndex].dayName}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-md border-2 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-lg text-green-700">Kasvislounas</h3>
              </div>
              <p className="text-gray-800 text-base leading-relaxed">
                {parsedMenu[todayIndex].vegetarian}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-md border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <UtensilsCrossed className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-lg text-blue-700">Lounas</h3>
              </div>
              <p className="text-gray-800 text-base leading-relaxed">
                {parsedMenu[todayIndex].regular}
              </p>
            </div>
            {parsedMenu[todayIndex].dessert && (
              <div className="bg-white rounded-lg p-4 shadow-md border-2 border-pink-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🍰</span>
                  <h3 className="font-bold text-lg text-pink-700">Jälkiruoka</h3>
                </div>
                <p className="text-gray-800 text-base leading-relaxed">
                  {parsedMenu[todayIndex].dessert}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Weekly Menu */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Viikon ruokalista
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parsedMenu.map((item, index) => {
            const isToday = index === todayIndex;
            const dayColors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500"];
            const dayColor = dayColors[index % dayColors.length];

            return (
              <Card 
                key={index} 
                className={`transition-all hover:shadow-xl ${
                  isToday ? 'ring-4 ring-orange-400 shadow-lg' : 'hover:scale-105'
                }`}
              >
                <CardHeader className={`${dayColor} text-white`}>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{item.dayName}</span>
                    {isToday && (
                      <span className="text-xs bg-white text-orange-600 px-2 py-1 rounded-full font-bold">
                        TÄNÄÄN
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-sm text-white/90">{item.date.split(",")[1]?.trim()}</p>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-green-700 mb-1 flex items-center gap-1">
                      <Leaf className="h-3 w-3" />
                      Kasvis
                    </p>
                    <p className="text-sm text-gray-700">{item.vegetarian}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-700 mb-1 flex items-center gap-1">
                      <UtensilsCrossed className="h-3 w-3" />
                      Lounas
                    </p>
                    <p className="text-sm text-gray-700">{item.regular}</p>
                  </div>
                  {item.dessert && (
                    <div>
                      <p className="text-xs font-bold text-pink-700 mb-1">🍰 Jälkiruoka</p>
                      <p className="text-sm text-gray-700">{item.dessert}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-2 border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="text-base flex items-center gap-2">
              <Leaf className="w-5 h-5 text-purple-600" />
              Erityisruokavaliot
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm text-gray-700">
              Jos sinulla on erityisruokavalio (esim. laktoositon, gluteeniton, allergia), 
              ilmoita siitä keittiöhenkilökunnalle. Voimme tarjota sinulle sopivan vaihtoehdon.
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Ruokahävikki
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm text-gray-700">
              Ota vain sen verran ruokaa kuin jaksat syödä. Yhdessä voimme vähentää ruokahävikkiä 
              ja toimia ympäristöystävällisemmin. Kiitos!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* External Link Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Lisätietoja koulusta</h3>
              <p className="text-sm text-gray-700">
                Vieraile koulumme verkkosivuilla saadaksesi lisätietoja tapahtumista, 
                uutisista ja muista tärkeistä asioista.
              </p>
            </div>
            <Button
              onClick={() => window.open('https://ksyk.fi', '_blank')}
              variant="outline"
              className="border-[#003d82] text-[#003d82] hover:bg-[#003d82] hover:text-white flex items-center gap-2 whitespace-nowrap"
            >
              <ExternalLink className="w-4 h-4" />
              ksyk.fi
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
