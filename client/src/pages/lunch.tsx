import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/LoadingSpinner";
import Header from "@/components/Header";
import { Calendar, UtensilsCrossed, Leaf, AlertCircle, RefreshCw } from "lucide-react";

interface MenuItem {
  date: string;
  dayName: string;
  vegetarian: string;
  regular: string;
  dessert?: string;
}

export default function Lunch() {
  const { i18n } = useTranslation();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayIndex, setTodayIndex] = useState(0);

  const fetchMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/lunch-menu");
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const items = xml.querySelectorAll("item");
      const parsedMenu: MenuItem[] = [];
      const today = new Date();
      let foundTodayIndex = 0;
      items.forEach((item, index) => {
        const title = item.querySelector("title")?.textContent || "";
        const description = item.querySelector("description")?.textContent || "";
        const dateMatch = title.match(/(\d{2})-(\d{2})-(\d{4})/);
        const dayName = title.split(",")[0] || "";
        if (dateMatch) {
          const itemDate = new Date(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]));
          if (itemDate.toDateString() === today.toDateString()) { foundTodayIndex = index; }
        }
        const lines = description.split("<br>").map(line => line.replace(/<[^>]*>/g, "").trim()).filter(line => line.length > 0);
        let vegetarian = "";
        let regular = "";
        let dessert = "";
        lines.forEach(line => {
          if (line.includes("Kasvislounas:")) { vegetarian = line.replace("Kasvislounas:", "").trim(); }
          else if (line.includes("Lounas:")) { regular = line.replace("Lounas:", "").trim(); }
          else if (line.includes("Jälkiruoka:")) { dessert = line.replace("Jälkiruoka:", "").trim(); }
        });
        parsedMenu.push({ date: title, dayName, vegetarian: vegetarian || "Ei saatavilla", regular: regular || "Ei saatavilla", dessert });
      });
      setMenuItems(parsedMenu);
      setTodayIndex(foundTodayIndex);
    } catch (err) {
      console.error("Failed to fetch menu:", err);
      setError("Ruokalistan lataaminen epäonnistui.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMenu(); }, []);

  const getDayColor = (index: number) => {
    const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500"];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <UtensilsCrossed className="h-12 w-12 text-orange-600" />
            <h1 className="text-4xl md:text-5xl font-black text-gray-900">{i18n.language === "fi" ? "Ruokalista" : "Lunch Menu"}</h1>
          </div>
          <p className="text-lg text-gray-600 mb-4">Amica - Kulis</p>
          <Button onClick={fetchMenu} variant="outline" size="sm" className="gap-2"><RefreshCw className="h-4 w-4" />{i18n.language === "fi" ? "Päivitä" : "Refresh"}</Button>
        </div>
        {loading && <LoadingSpinner fullScreen={false} message={i18n.language === "fi" ? "Ladataan ruokalistaa..." : "Loading menu..."} />}
        {error && <Card className="border-red-200 bg-red-50"><CardContent className="pt-6"><div className="flex items-center gap-3 text-red-700"><AlertCircle className="h-6 w-6" /><p className="font-semibold">{error}</p></div></CardContent></Card>}
        {!loading && !error && menuItems.length > 0 && (
          <>
            <Card className="mb-8 border-4 border-orange-500 shadow-2xl bg-gradient-to-br from-orange-50 to-yellow-50">
              <CardHeader className="bg-orange-500 text-white"><CardTitle className="flex items-center justify-between"><span className="flex items-center gap-2"><Calendar className="h-6 w-6" />{i18n.language === "fi" ? "Tänään" : "Today"}</span><Badge className="bg-white text-orange-600 text-lg px-4 py-1">{menuItems[todayIndex]?.dayName}</Badge></CardTitle></CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-md border-2 border-green-200"><div className="flex items-center gap-2 mb-2"><Leaf className="h-5 w-5 text-green-600" /><h3 className="font-bold text-lg text-green-700">{i18n.language === "fi" ? "Kasvislounas" : "Vegetarian"}</h3></div><p className="text-gray-800 text-base leading-relaxed">{menuItems[todayIndex]?.vegetarian}</p></div>
                <div className="bg-white rounded-lg p-4 shadow-md border-2 border-blue-200"><div className="flex items-center gap-2 mb-2"><UtensilsCrossed className="h-5 w-5 text-blue-600" /><h3 className="font-bold text-lg text-blue-700">{i18n.language === "fi" ? "Lounas" : "Regular"}</h3></div><p className="text-gray-800 text-base leading-relaxed">{menuItems[todayIndex]?.regular}</p></div>
                {menuItems[todayIndex]?.dessert && <div className="bg-white rounded-lg p-4 shadow-md border-2 border-pink-200"><div className="flex items-center gap-2 mb-2"><span className="text-2xl">🍰</span><h3 className="font-bold text-lg text-pink-700">{i18n.language === "fi" ? "Jälkiruoka" : "Dessert"}</h3></div><p className="text-gray-800 text-base leading-relaxed">{menuItems[todayIndex]?.dessert}</p></div>}
              </CardContent>
            </Card>
            <div className="mb-8"><h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2"><Calendar className="h-6 w-6 text-blue-600" />{i18n.language === "fi" ? "Viikon ruokalista" : "Weekly Menu"}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{menuItems.map((item, index) => (
                <Card key={index} className={`transition-all hover:shadow-xl ${index === todayIndex ? "ring-4 ring-orange-400 shadow-lg" : "hover:scale-105"}`}>
                  <CardHeader className={`${getDayColor(index)} text-white`}><CardTitle className="text-lg flex items-center justify-between"><span>{item.dayName}</span>{index === todayIndex && <Badge className="bg-white text-orange-600">{i18n.language === "fi" ? "Tänään" : "Today"}</Badge>}</CardTitle><p className="text-sm text-white/90">{item.date.split(",")[1]?.trim()}</p></CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div><p className="text-xs font-bold text-green-700 mb-1 flex items-center gap-1"><Leaf className="h-3 w-3" />{i18n.language === "fi" ? "Kasvis" : "Vegetarian"}</p><p className="text-sm text-gray-700">{item.vegetarian}</p></div>
                    <div><p className="text-xs font-bold text-blue-700 mb-1 flex items-center gap-1"><UtensilsCrossed className="h-3 w-3" />{i18n.language === "fi" ? "Lounas" : "Regular"}</p><p className="text-sm text-gray-700">{item.regular}</p></div>
                    {item.dessert && <div><p className="text-xs font-bold text-pink-700 mb-1">🍰 {i18n.language === "fi" ? "Jälkiruoka" : "Dessert"}</p><p className="text-sm text-gray-700">{item.dessert}</p></div>}
                  </CardContent>
                </Card>
              ))}</div>
            </div>
            <Card className="bg-blue-50 border-blue-200"><CardContent className="pt-6"><div className="text-center space-y-2"><p className="text-sm text-gray-600">{i18n.language === "fi" ? "Ruokalista tarjoaa Amica / Compass Group Finland" : "Menu provided by Amica / Compass Group Finland"}</p><p className="text-xs text-gray-500">{i18n.language === "fi" ? "Ruokalista voi muuttua ilman ennakkoilmoitusta" : "Menu subject to change without notice"}</p></div></CardContent></Card>
          </>
        )}
      </div>
    </div>
  );
}
