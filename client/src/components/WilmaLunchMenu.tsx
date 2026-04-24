import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, ExternalLink, Calendar, Clock, Leaf, AlertCircle } from "lucide-react";

export default function WilmaLunchMenu() {
  const today = new Date();
  const weekdays = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'];
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Mock lunch menu data
  const lunchMenu = [
    {
      day: 'Maanantai',
      main: 'Lihapullat ja perunamuusi',
      vegetarian: 'Kasvisjauheliha ja perunamuusi',
      salad: 'Salaattipöytä',
      dessert: 'Hedelmä',
      allergens: ['Maito', 'Gluteeni']
    },
    {
      day: 'Tiistai',
      main: 'Broilerkastike ja riisi',
      vegetarian: 'Kasvis-currykastike ja riisi',
      salad: 'Salaattipöytä',
      dessert: 'Jogurtti',
      allergens: ['Maito']
    },
    {
      day: 'Keskiviikko',
      main: 'Kalakeitto ja leipää',
      vegetarian: 'Kasviskeitto ja leipää',
      salad: 'Salaattipöytä',
      dessert: 'Marjapuuro',
      allergens: ['Kala', 'Maito', 'Gluteeni']
    },
    {
      day: 'Torstai',
      main: 'Spagetti ja jauhelihakastike',
      vegetarian: 'Spagetti ja kasvisjauhelihakastike',
      salad: 'Salaattipöytä',
      dessert: 'Hedelmä',
      allergens: ['Gluteeni', 'Maito']
    },
    {
      day: 'Perjantai',
      main: 'Lohikiusaus ja salaatti',
      vegetarian: 'Kasvisgratiini ja salaatti',
      salad: 'Salaattipöytä',
      dessert: 'Jäätelö',
      allergens: ['Kala', 'Maito']
    }
  ];

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

      {/* Info Card */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-blue-900">Lounasaika</p>
              <p className="text-sm text-blue-800 mt-1">
                Lounas tarjoillaan klo 11:00-13:00 välisenä aikana. 
                Muista noudattaa ruokailusääntöjä ja palauttaa astiat niille varattuun paikkaan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Menu */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lunchMenu.map((menu, idx) => {
          const dayIndex = idx + 1; // Monday = 1
          const isToday = currentDay === dayIndex;
          
          return (
            <Card 
              key={menu.day} 
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
                    {menu.day}
                  </span>
                  {isToday && (
                    <span className="text-xs bg-white text-green-600 px-2 py-1 rounded-full font-bold">
                      TÄNÄÄN
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {/* Main Course */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <UtensilsCrossed className="w-4 h-4 text-[#003d82]" />
                    <p className="text-xs font-semibold text-gray-600">Pääruoka</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{menu.main}</p>
                </div>

                {/* Vegetarian Option */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Leaf className="w-4 h-4 text-green-600" />
                    <p className="text-xs font-semibold text-gray-600">Kasvisvaihtoehto</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{menu.vegetarian}</p>
                </div>

                {/* Salad & Dessert */}
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Lisäksi:</span> {menu.salad}, {menu.dessert}
                  </p>
                </div>

                {/* Allergens */}
                {menu.allergens.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-600">Allergeenit:</p>
                        <p className="text-xs text-gray-600">{menu.allergens.join(', ')}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
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
