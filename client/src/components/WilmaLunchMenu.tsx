import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, ExternalLink, Calendar, Leaf, AlertCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface MenuItem {
  name: string;
  diets?: string;
  allergens?: string;
}

interface MenuDay {
  date: string;
  items: MenuItem[];
}

export default function WilmaLunchMenu() {
  const today = new Date();
  const weekdays = ['Sunnuntai', 'Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai'];
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Fetch real lunch menu data from Compass Group API
  const { data: menuData, isLoading, error } = useQuery({
    queryKey: ['lunch-menu'],
    queryFn: async () => {
      const response = await fetch('https://www.compass-group.fi/menuapi/feed/json?costNumber=3026&language=fi');
      if (!response.ok) throw new Error('Failed to fetch menu');
      return await response.json();
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: 2
  });

  // Parse menu data
  const parsedMenu: MenuDay[] = menuData?.menus?.[0]?.days || [];

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
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Lounaslista</h2>
            <p className="text-gray-600 mt-1">Kulosaaren yhteiskoulun ruokalista</p>
          </div>
          <Button
            onClick={() => window.open('https://ksyk.fi', '_blank')}
            className="bg-[#003d82] hover:bg-[#0052a3] flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Koulun verkkosivuille
          </Button>
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
          <p className="text-gray-600 mt-1">Kulosaaren yhteiskoulun ruokalista</p>
        </div>
        <Button
          onClick={() => window.open('https://ksyk.fi', '_blank')}
          className="bg-[#003d82] hover:bg-[#0052a3] flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Koulun verkkosivuille
        </Button>
      </div>

      {/* Weekly Menu */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parsedMenu.map((menuDay, idx) => {
          const menuDate = new Date(menuDay.date);
          const dayName = weekdays[menuDate.getDay()];
          const isToday = menuDate.toDateString() === today.toDateString();
          // Skip weekends
          if (menuDate.getDay() === 0 || menuDate.getDay() === 6) return null;

          // Get menu items
          const mainDishes = menuDay.items.filter((item: MenuItem) => 
            !item.diets?.includes('G') && !item.diets?.includes('VEG')
          );
          const vegetarianDishes = menuDay.items.filter((item: MenuItem) => 
            item.diets?.includes('VEG') || item.diets?.includes('G')
          );

          return (
            <Card 
              key={menuDay.date} 
              className={`border-2 transition-all ${
                isToday 
                  ? 'border-green-500 shadow-lg scale-105' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CardHeader className={`${
                isToday 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                  : 'bg-gradient-to-r from-gray-50 to-gray-100'
              }`}>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {dayName} {menuDate.getDate()}.{menuDate.getMonth() + 1}.
                  </span>
                  {isToday && (
                    <span className="text-xs bg-white text-green-600 px-2 py-1 rounded-full font-bold">
                      TÄNÄÄN
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {/* Main Dishes */}
                {mainDishes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <UtensilsCrossed className="w-4 h-4 text-[#003d82]" />
                      <p className="text-xs font-semibold text-gray-600">Pääruoka</p>
                    </div>
                    {mainDishes.map((item: MenuItem, i: number) => (
                      <div key={i} className="mb-2">
                        <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                        {item.diets && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.diets}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Vegetarian Options */}
                {vegetarianDishes.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Leaf className="w-4 h-4 text-green-600" />
                      <p className="text-xs font-semibold text-gray-600">Kasvisvaihtoehto</p>
                    </div>
                    {vegetarianDishes.map((item: MenuItem, i: number) => (
                      <div key={i} className="mb-2">
                        <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                        {item.diets && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.diets}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Show all items if no categorization */}
                {mainDishes.length === 0 && vegetarianDishes.length === 0 && menuDay.items.length > 0 && (
                  <div>
                    {menuDay.items.map((item: MenuItem, i: number) => (
                      <div key={i} className="mb-2">
                        <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                        {item.diets && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.diets}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* No menu available */}
                {menuDay.items.length === 0 && (
                  <p className="text-sm text-gray-500 italic">Ei ruokalistaa saatavilla</p>
                )}
              </CardContent>
            </Card>
          );
        }).filter(Boolean)}
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
