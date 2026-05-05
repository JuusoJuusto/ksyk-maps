import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { 
  GraduationCap, 
  Users, 
  Calendar, 
  MessageSquare, 
  BarChart3, 
  Shield, 
  Zap, 
  Globe,
  CheckCircle,
  ArrowRight,
  Star,
  TrendingUp,
  Award,
  BookOpen,
  Smartphone,
  Lock
} from "lucide-react";

export default function WilmaLanding() {
  const [, setLocation] = useLocation();
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: Users,
      title: "Opiskelijahallinta",
      description: "Hallitse opiskelijoita, huoltajia ja henkilökuntaa yhdestä paikasta",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Calendar,
      title: "Lukujärjestykset",
      description: "Automaattiset lukujärjestykset ja aikataulut koko koululle",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: MessageSquare,
      title: "Viestintä",
      description: "Tehokas viestintä opettajien, oppilaiden ja huoltajien välillä",
      color: "from-green-500 to-green-600"
    },
    {
      icon: BarChart3,
      title: "Analytiikka",
      description: "Reaaliaikaiset raportit ja tilastot koulun toiminnasta",
      color: "from-orange-500 to-orange-600"
    },
    {
      icon: Shield,
      title: "Tietoturva",
      description: "Korkean tason tietoturva ja GDPR-yhteensopivuus",
      color: "from-red-500 to-red-600"
    },
    {
      icon: Smartphone,
      title: "Mobiilisovellus",
      description: "Käytä Wilmaa missä tahansa, millä tahansa laitteella",
      color: "from-indigo-500 to-indigo-600"
    }
  ];

  const stats = [
    { number: "10,000+", label: "Aktiivista käyttäjää", icon: Users },
    { number: "500+", label: "Koulua käyttää", icon: GraduationCap },
    { number: "99.9%", label: "Käytettävyysaika", icon: TrendingUp },
    { number: "24/7", label: "Asiakastuki", icon: MessageSquare }
  ];

  const testimonials = [
    {
      name: "Maria Virtanen",
      role: "Rehtori, Helsingin Yhteiskoulu",
      content: "Wilma on mullistanut koulumme hallinnon. Kaikki tieto on nyt yhdessä paikassa ja helposti saatavilla.",
      rating: 5
    },
    {
      name: "Jukka Mäkinen",
      role: "Opettaja, Espoon Lukio",
      content: "Oppilaiden seuranta ja arviointi on nyt paljon helpompaa. Säästän aikaa joka viikko.",
      rating: 5
    },
    {
      name: "Anna Korhonen",
      role: "Huoltaja",
      content: "Voin seurata lapseni edistymistä reaaliajassa. Viestintä opettajien kanssa on vaivatonta.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 overflow-hidden">
      {/* Hero Section with Parallax */}
      <section 
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          transform: `translateY(${scrollY * 0.5}px)`,
        }}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute w-96 h-96 bg-blue-400/20 rounded-full blur-3xl -top-48 -left-48"
            style={{ transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.1}px)` }}
          />
          <div 
            className="absolute w-96 h-96 bg-purple-400/20 rounded-full blur-3xl -bottom-48 -right-48"
            style={{ transform: `translate(${-scrollY * 0.1}px, ${-scrollY * 0.1}px)` }}
          />
        </div>

        <div className={`relative z-10 text-center px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="mb-6 inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold">
            <Zap className="w-4 h-4" />
            Suomen johtava oppilashallintojärjestelmä
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-gradient">
            Wilma
          </h1>
          
          <p className="text-2xl md:text-3xl text-gray-700 mb-4 font-light">
            Moderni oppilashallintojärjestelmä
          </p>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Tehosta koulusi hallintoa, paranna viestintää ja seuraa oppilaiden edistymistä reaaliajassa
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg shadow-2xl hover:shadow-blue-500/50 transition-all"
              onClick={() => setLocation("/wilma")}
            >
              Aloita ilmainen kokeilu
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Tutustu ominaisuuksiin
            </Button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Ei luottokorttia tarvita</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>30 päivän rahat takaisin</span>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-blue-600 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-blue-600 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div 
                key={idx}
                className="text-center transform hover:scale-110 transition-transform duration-300"
                style={{
                  animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`
                }}
              >
                <stat.icon className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                <div className="text-4xl font-bold text-gray-800 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative">
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(59, 130, 246, 0.1) 1px, transparent 0)',
            backgroundSize: '40px 40px',
            transform: `translateY(${scrollY * 0.2}px)`
          }}
        />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Kaikki mitä tarvitset
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Wilma tarjoaa kattavan valikoiman työkaluja koulun tehokkaaseen hallintaan
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <Card 
                key={idx}
                className="p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-blue-200 bg-white/80 backdrop-blur-sm"
                style={{
                  animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`
                }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-800">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-32 bg-gradient-to-br from-blue-600 to-purple-600 text-white relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            transform: `translateX(${scrollY * 0.1}px)`
          }}
        />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6">Mitä asiakkaamme sanovat</h2>
            <p className="text-xl text-blue-100">Tuhannet koulut luottavat Wilmaan päivittäin</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <Card 
                key={idx}
                className="p-8 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-lg mb-6 text-white/90 italic">"{testimonial.content}"</p>
                <div>
                  <div className="font-bold text-white">{testimonial.name}</div>
                  <div className="text-sm text-blue-200">{testimonial.role}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Award className="w-20 h-20 mx-auto mb-8 text-blue-600" />
          <h2 className="text-5xl font-bold mb-6 text-gray-800">
            Valmis modernisoimaan koulusi?
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Liity tuhansien koulujen joukkoon, jotka ovat jo tehneet valinnan
          </p>
          <Button 
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-12 py-8 text-xl shadow-2xl hover:shadow-blue-500/50 transition-all"
            onClick={() => setLocation("/wilma")}
          >
            Aloita ilmainen 30 päivän kokeilu
            <ArrowRight className="ml-3 w-6 h-6" />
          </Button>
          <p className="mt-6 text-gray-500">
            Ei luottokorttia tarvita • Peruuta milloin tahansa • 24/7 tuki
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <GraduationCap className="w-6 h-6" />
                Wilma
              </h3>
              <p className="text-gray-400">
                Suomen johtava oppilashallintojärjestelmä
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Tuote</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Ominaisuudet</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Hinnoittelu</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tietoturva</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Yritys</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Tietoa meistä</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blogi</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Ura</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Tuki</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Ohje</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Yhteystiedot</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tila</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>© 2026 Wilma. Kaikki oikeudet pidätetään.</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
