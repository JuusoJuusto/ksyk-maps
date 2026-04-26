import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, CheckCircle, XCircle, Brain, Zap, 
  TrendingUp, FileText, Clock, AlertCircle 
} from "lucide-react";

interface AIDetectionResult {
  aiScore: number; // 0-100, higher = more likely AI
  confidence: number; // 0-100
  flagged: boolean;
  details: {
    perplexity: number;
    burstiness: number;
    patterns: string[];
    suspiciousIndicators: string[];
  };
  timestamp: string;
}

export default function AIDetectionChecker() {
  const [text, setText] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<AIDetectionResult | null>(null);
  const [error, setError] = useState("");

  const checkAI = async () => {
    if (!text || text.trim().length < 50) {
      setError("Tekstin on oltava vähintään 50 merkkiä pitkä");
      return;
    }

    setIsChecking(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch('/api/wilma/homework/check-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      });

      if (!response.ok) {
        throw new Error('AI-tarkistus epäonnistui');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Virhe AI-tarkistuksessa. Yritä uudelleen.');
      console.error('AI detection error:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score < 30) return "text-[#28a745]";
    if (score < 60) return "text-[#ffc107]";
    return "text-[#dc3545]";
  };

  const getScoreBgColor = (score: number) => {
    if (score < 30) return "bg-[#28a745]";
    if (score < 60) return "bg-[#ffc107]";
    return "bg-[#dc3545]";
  };

  const getScoreLabel = (score: number) => {
    if (score < 30) return "Todennäköisesti ihmisen kirjoittama";
    if (score < 60) return "Epävarma - tarkista manuaalisesti";
    return "Todennäköisesti AI:n kirjoittama";
  };

  return (
    <div className="space-y-6">
      <Card className="border-[#003d82]">
        <CardHeader className="bg-gradient-to-r from-[#e6f2ff] to-[#f0f8ff]">
          <CardTitle className="flex items-center gap-2 text-[#003d82]">
            <Brain className="w-6 h-6" />
            AI-tunnistus
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Tarkista, onko teksti kirjoitettu tekoälyn avulla. Syötä vähintään 50 merkkiä.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tarkistettava teksti
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Liitä tähän tarkistettava teksti..."
              className="min-h-[200px] font-mono text-sm"
              disabled={isChecking}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                {text.length} merkkiä (vähintään 50 vaaditaan)
              </span>
              <span className="text-xs text-gray-500">
                {text.split(/\s+/).filter(w => w.length > 0).length} sanaa
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-[#f8d7da] border border-[#dc3545] text-[#dc3545] px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <Button
            onClick={checkAI}
            disabled={isChecking || text.trim().length < 50}
            className="w-full bg-[#003d82] hover:bg-[#002855] text-white"
          >
            {isChecking ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Tarkistetaan...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Tarkista AI-sisältö
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-[#003d82]">
          <CardHeader className="bg-gradient-to-r from-[#e6f2ff] to-[#f0f8ff]">
            <CardTitle className="flex items-center gap-2 text-[#003d82]">
              <FileText className="w-6 h-6" />
              Tarkistustulos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* AI Score */}
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(result.aiScore)} mb-2`}>
                {result.aiScore}%
              </div>
              <p className="text-lg font-semibold text-gray-700 mb-4">
                {getScoreLabel(result.aiScore)}
              </p>
              <Progress 
                value={result.aiScore} 
                className="h-3"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Ihminen</span>
                <span>AI</span>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex justify-center">
              {result.flagged ? (
                <Badge className="bg-[#dc3545] text-white px-4 py-2 text-base">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Merkitty tarkistettavaksi
                </Badge>
              ) : (
                <Badge className="bg-[#28a745] text-white px-4 py-2 text-base">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Ei merkitty
                </Badge>
              )}
            </div>

            {/* Confidence */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Luotettavuus</span>
                <span className="text-lg font-bold text-[#003d82]">{result.confidence}%</span>
              </div>
              <Progress value={result.confidence} className="h-2" />
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#e6f2ff] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-[#003d82]" />
                  <span className="font-semibold text-gray-700">Perplexity</span>
                </div>
                <p className="text-2xl font-bold text-[#003d82]">
                  {result.details.perplexity.toFixed(2)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Matala = AI, Korkea = Ihminen
                </p>
              </div>

              <div className="bg-[#e6f2ff] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-[#003d82]" />
                  <span className="font-semibold text-gray-700">Burstiness</span>
                </div>
                <p className="text-2xl font-bold text-[#003d82]">
                  {result.details.burstiness.toFixed(2)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Matala = AI, Korkea = Ihminen
                </p>
              </div>
            </div>

            {/* Patterns */}
            {result.details.patterns.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[#003d82]" />
                  Havaitut mallit
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.details.patterns.map((pattern, idx) => (
                    <Badge key={idx} variant="outline" className="text-sm">
                      {pattern}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Suspicious Indicators */}
            {result.details.suspiciousIndicators.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#ffc107]" />
                  Epäilyttävät indikaattorit
                </h4>
                <ul className="space-y-2">
                  {result.details.suspiciousIndicators.map((indicator, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <XCircle className="w-4 h-4 text-[#dc3545] flex-shrink-0 mt-0.5" />
                      <span>{indicator}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timestamp */}
            <div className="text-center text-xs text-gray-500 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              Tarkistettu: {new Date(result.timestamp).toLocaleString('fi-FI')}
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Huom!</strong> AI-tunnistus on vain apuväline. Lopullinen arvio tulisi aina tehdä opettajan toimesta.
                Tulos perustuu tekstin rakenteeseen, sanavalintoihin ja kirjoitustyyliin.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
