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

  // Wilma brand colors
  const wilmaBlue = "#003d82";
  const wilmaLightBlue = "#0052a3";
  const wilmaAccent = "#00a8e8";

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
      description: "Hallitse opiskelijoita, huoltajia ja henkilökuntaa yhdestä paikasta"
    },
    {
      icon: Calendar,
      title: "Lukujärjestykset",
      description: "Automaattiset lukujärjestykset ja aikataulut koko koululle"
    },
    {
      icon: MessageSquare,
      title: "Viestintä",
      description: "Tehokas viestintä opettajien, oppilaiden ja huoltajien välillä"
    },
    {
      icon: BarChart3,
      title: "Analytiikka",
      description: "Reaaliaikaiset raportit ja tilastot koulun toiminnasta"
    },
    {
      icon: Shield,
      title: "Tietoturva",
      description: "Korkean tason tietoturva ja GDPR-yhteensopivuus"
    },
    {
      icon: Smartphone,
      title: "Mobiilisovellus",
      description: "Käytä Wilmaa missä tahansa, millä tahansa laitteella"
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
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section with Smooth Animations */}
      <section 
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #003d82 0%, #0052a3 50%, #00a8e8 100%)',
          transform: `translateY(${scrollY * 0.3}px)`,
        }}
      >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div 
            className="absolute w-96 h-96 rounded-full bg-white"
            style={{ 
              top: '-10%',
              left: '-5%',
              transform: `translate(${scrollY * 0.05}px, ${scrollY * 0.05}px)`,
              filter: 'blur(100px)'
            }}
          />
          <div 
            className="absolute w-96 h-96 rounded-full bg-white"
            style={{ 
              bottom: '-10%',
              right: '-5%',
              transform: `translate(${-scrollY * 0.05}px, ${-scrollY * 0.05}px)`,
              filter: 'blur(100px)'
            }}
          />
        </div>

        <div className={`relative z-10 text-center px-4 max-w-5xl transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="mb-8 inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold border-2 border-white/30 bg-white/10 backdrop-blur-md text-white shadow-2xl animate-pulse">
            <Zap className="w-5 h-5" />
            Suomen johtava oppilashallintojärjestelmä
          </div>
          
          <h1 className="text-7xl md:text-9xl font-black mb-8 text-white drop-shadow-2xl">
            Wilma
          </h1>
          
          <p className="text-3xl md:text-4xl text-white mb-6 font-bold drop-shadow-lg">
            Moderni oppilashallintojärjestelmä
          </p>
          
          <p className="text-xl md:text-2xl text-white/90 mb-6 max-w-3xl mx-auto drop-shadow-md">
            Tehosta koulusi hallintoa, paranna viestintää ja seuraa oppilaiden edistymistä reaaliajassa
          </p>
          
          <p className="text-lg text-white/80 mb-12 flex items-center justify-center gap-2 drop-shadow-md">
            <span>Powered by</span>
            <span className="font-black text-2xl">Nordbyte Studio</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <Button 
              size="lg" 
              className="px-12 py-8 text-xl font-bold shadow-2xl hover:shadow-3xl transition-all transform hover:scale-110 bg-white text-[#003d82] hover:bg-gray-100"
              onClick={() => setLocation("/wilma")}
            >
              Aloita ilmainen kokeilu
              <ArrowRight className="ml-3 w-6 h-6" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="px-12 py-8 text-xl font-bold border-4 border-white text-white hover:bg-white hover:text-[#003d82] transition-all transform hover:scale-110"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Tutustu ominaisuuksiin
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-base text-white/90">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full">
              <CheckCircle className="w-6 h-6" />
              <span className="font-semibold">Ei luottokorttia tarvita</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full">
              <CheckCircle className="w-6 h-6" />
              <span className="font-semibold">30 päivän rahat takaisin</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full">
              <CheckCircle className="w-6 h-6" />
              <span className="font-semibold">24/7 Tuki</span>
            </div>
          </div>
        </div>

        {/* Smooth Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-8 h-12 border-4 border-white rounded-full flex items-start justify-center p-2">
            <div className="w-2 h-4 rounded-full bg-white animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
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
                <stat.icon className="w-12 h-12 mx-auto mb-4" style={{ color: wilmaBlue }} />
                <div className="text-4xl font-bold mb-2" style={{ color: wilmaBlue }}>{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative bg-white">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0, 61, 130, 0.1) 1px, transparent 0)',
            backgroundSize: '40px 40px',
            transform: `translateY(${scrollY * 0.1}px)`
          }}
        />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6" style={{ color: wilmaBlue }}>
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
                className="p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 bg-white"
                style={{
                  animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`,
                  borderColor: `${wilmaBlue}20`
                }}
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg" style={{ backgroundColor: wilmaBlue }}>
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
      <section className="py-32 text-white relative overflow-hidden" style={{ backgroundColor: wilmaBlue }}>
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            transform: `translateX(${scrollY * 0.05}px)`
          }}
        />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6">Mitä asiakkaamme sanovat</h2>
            <p className="text-xl opacity-90">Tuhannet koulut luottavat Wilmaan päivittäin</p>
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
                  <div className="text-sm opacity-80">{testimonial.role}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Award className="w-20 h-20 mx-auto mb-8" style={{ color: wilmaBlue }} />
          <h2 className="text-5xl font-bold mb-6 text-gray-800">
            Valmis modernisoimaan koulusi?
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Liity tuhansien koulujen joukkoon, jotka ovat jo tehneet valinnan
          </p>
          <Button 
            size="lg"
            className="px-12 py-8 text-xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
            style={{ backgroundColor: wilmaBlue, color: 'white' }}
            onClick={() => setLocation("/wilma")}
          >
            Aloita ilmainen 30 päivän kokeilu
            <ArrowRight className="ml-3 w-6 h-6" />
          </Button>
          <p className="mt-6 text-gray-500">
            Ei luottokorttia tarvita • Peruuta milloin tahansa • 24/7 tuki
          </p>
          <p className="mt-4 text-sm text-gray-400">
            Powered by <span className="font-bold" style={{ color: wilmaBlue }}>Nordbyte Studio</span>
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
              <p className="text-gray-400 mb-2">
                Suomen johtava oppilashallintojärjestelmä
              </p>
              <p className="text-sm text-gray-500">
                by <span className="font-bold" style={{ color: wilmaAccent }}>Nordbyte Studio</span>
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Tuote</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">Ominaisuudet</button></li>
                <li><button onClick={() => setLocation("/wilma")} className="hover:text-white transition-colors">Hinnoittelu</button></li>
                <li><button onClick={() => setLocation("/wilma")} className="hover:text-white transition-colors">Tietoturva</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Yritys</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => setLocation("/wilma")} className="hover:text-white transition-colors">Tietoa meistä</button></li>
                <li><button onClick={() => setLocation("/wilma")} className="hover:text-white transition-colors">Blogi</button></li>
                <li><button onClick={() => setLocation("/wilma")} className="hover:text-white transition-colors">Ura</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Tuki</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => setLocation("/support")} className="hover:text-white transition-colors">Ohje</button></li>
                <li><button onClick={() => setLocation("/support")} className="hover:text-white transition-colors">Yhteystiedot</button></li>
                <li><button onClick={() => setLocation("/wilma")} className="hover:text-white transition-colors">Tila</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>© 2026 Wilma by Nordbyte Studio. Kaikki oikeudet pidätetään.</p>
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
      `}</style>
    </div>
  );
}
