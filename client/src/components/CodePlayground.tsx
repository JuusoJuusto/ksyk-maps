import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  Save, 
  Download, 
  Share2, 
  Sparkles, 
  Terminal,
  FileCode,
  Lightbulb,
  CheckCircle,
  XCircle,
  Loader2,
  Brain
} from "lucide-react";
import { runPythonCode, runPythonTests, isPyodideLoading } from "@/lib/pythonRunner";
import { getCodingHelp } from "@/lib/codingAI";

interface CodePlaygroundProps {
  language: 'fi' | 'en';
  initialCode?: string;
  testCases?: Array<{ input: string; expectedOutput: string; hidden?: boolean }>;
  onSubmit?: (code: string, passed: boolean, xpEarned: number) => void;
}

export default function CodePlayground({
  language,
  initialCode = '# Write your Python code here\nprint("Hello, World!")',
  testCases,
  onSubmit
}: CodePlaygroundProps) {
  const t = (fi: string, en: string) => language === 'fi' ? fi : en;
  
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [aiHelp, setAiHelp] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [savedCodes, setSavedCodes] = useState<Array<{ name: string; code: string; date: string }>>([]);

  useEffect(() => {
    // Load saved codes from localStorage
    const saved = localStorage.getItem('saved_codes');
    if (saved) {
      setSavedCodes(JSON.parse(saved));
    }
  }, []);

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('');
    setTestResults(null);

    try {
      if (testCases && testCases.length > 0) {
        // Run with test cases
        const results = await runPythonTests(code, testCases);
        setTestResults(results);
        
        if (results.allPassed && onSubmit) {
          const xpEarned = testCases.length * 10;
          onSubmit(code, true, xpEarned);
        }
      } else {
        // Run without test cases
        const result = await runPythonCode(code);
        if (result.success) {
          setOutput(result.output || t('(Ei tulostetta)', '(No output)'));
        } else {
          setOutput(`❌ ${t('Virhe', 'Error')}: ${result.error}`);
        }
      }
    } catch (error: any) {
      setOutput(`❌ ${t('Virhe', 'Error')}: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleGetAIHelp = async () => {
    setIsLoadingAI(true);
    setAiHelp('');

    try {
      const response = await getCodingHelp({
        question: t(
          'Selitä tämä koodi ja anna vinkkejä sen parantamiseen',
          'Explain this code and give tips to improve it'
        ),
        code,
        language: 'python'
      });

      if (response.success && response.answer) {
        setAiHelp(response.answer);
      } else {
        setAiHelp(t(
          'AI-avustaja ei ole juuri nyt saatavilla. Yritä myöhemmin uudelleen.',
          'AI assistant is not available right now. Please try again later.'
        ));
      }
    } catch (error) {
      setAiHelp(t(
        'Virhe yhdistettäessä AI-avustajaan.',
        'Error connecting to AI assistant.'
      ));
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSaveCode = () => {
    const name = prompt(t('Anna koodille nimi:', 'Give your code a name:'));
    if (name) {
      const newSaved = [
        ...savedCodes,
        {
          name,
          code,
          date: new Date().toLocaleDateString(language === 'fi' ? 'fi-FI' : 'en-US')
        }
      ];
      setSavedCodes(newSaved);
      localStorage.setItem('saved_codes', JSON.stringify(newSaved));
      alert(t('Koodi tallennettu!', 'Code saved!'));
    }
  };

  const handleDownloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code-${Date.now()}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadSavedCode = (savedCode: string) => {
    setCode(savedCode);
    setOutput('');
    setTestResults(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-blue-600" />
              {t('Koodieditori', 'Code Editor')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50">
                Python 3.11
              </Badge>
              {isPyodideLoading() && (
                <Badge variant="outline" className="bg-yellow-50">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  {t('Ladataan...', 'Loading...')}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="editor" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="editor">{t('Editori', 'Editor')}</TabsTrigger>
              <TabsTrigger value="output">{t('Tuloste', 'Output')}</TabsTrigger>
              <TabsTrigger value="saved">{t('Tallennetut', 'Saved')}</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-4">
              <div className="relative">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-96 p-4 font-mono text-sm bg-gray-900 text-gray-100 rounded-lg border-2 border-gray-700 focus:border-blue-500 focus:outline-none resize-none"
                  spellCheck={false}
                  placeholder={t('Kirjoita Python-koodisi tähän...', 'Write your Python code here...')}
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="bg-gray-800 hover:bg-gray-700 text-white"
                    onClick={handleSaveCode}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="bg-gray-800 hover:bg-gray-700 text-white"
                    onClick={handleDownloadCode}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('Suoritetaan...', 'Running...')}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      {testCases ? t('Suorita testit', 'Run Tests') : t('Suorita koodi', 'Run Code')}
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleGetAIHelp}
                  disabled={isLoadingAI}
                  variant="outline"
                  className="border-purple-300 hover:bg-purple-50"
                >
                  {isLoadingAI ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      {t('AI-apu', 'AI Help')}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="output" className="space-y-4">
              {testResults ? (
                <div className="space-y-3">
                  <div className={`p-4 rounded-lg border-2 ${
                    testResults.allPassed 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-red-50 border-red-300'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {testResults.allPassed ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-900">
                            {t('Kaikki testit läpäisty!', 'All tests passed!')}
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-600" />
                          <span className="font-semibold text-red-900">
                            {t('Jotkut testit epäonnistuivat', 'Some tests failed')}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {t('Suoritusaika', 'Execution time')}: {testResults.executionTime}ms
                    </div>
                  </div>

                  {testResults.results.map((result: any, index: number) => (
                    !result.hidden && (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          result.passed 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {result.passed ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="font-semibold text-sm">
                            {t('Testi', 'Test')} {index + 1}
                          </span>
                        </div>
                        {result.input && (
                          <div className="text-sm mb-1">
                            <span className="font-semibold">{t('Syöte', 'Input')}:</span> {result.input}
                          </div>
                        )}
                        <div className="text-sm mb-1">
                          <span className="font-semibold">{t('Odotettu', 'Expected')}:</span> {result.expectedOutput}
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold">{t('Saatu', 'Got')}:</span> {result.actualOutput || result.error}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              ) : output ? (
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
                  <div className="flex items-center gap-2 mb-2 text-gray-400">
                    <Terminal className="w-4 h-4" />
                    <span className="text-xs">{t('Tuloste', 'Output')}</span>
                  </div>
                  {output}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Terminal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{t('Suorita koodi nähdäksesi tuloksen', 'Run code to see output')}</p>
                </div>
              )}

              {aiHelp && (
                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      {t('AI-avustaja', 'AI Assistant')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm whitespace-pre-wrap">{aiHelp}</div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="saved" className="space-y-3">
              {savedCodes.length > 0 ? (
                savedCodes.map((saved, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4" onClick={() => loadSavedCode(saved.code)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{saved.name}</div>
                          <div className="text-sm text-gray-600">{saved.date}</div>
                        </div>
                        <Button size="sm" variant="outline">
                          {t('Lataa', 'Load')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{t('Ei tallennettuja koodeja', 'No saved codes')}</p>
                  <p className="text-sm mt-2">
                    {t('Tallenna koodisi käyttääksesi niitä myöhemmin', 'Save your code to use it later')}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
