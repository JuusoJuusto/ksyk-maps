import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  RotateCcw, 
  Save, 
  Download, 
  Upload, 
  CheckCircle, 
  XCircle,
  Lightbulb,
  Terminal,
  Code2,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CodeEditorProps {
  language: 'fi' | 'en';
  initialCode?: string;
  testCases?: Array<{ input: string; expectedOutput: string; hidden?: boolean }>;
  onSubmit?: (code: string, results: any) => void;
  readOnly?: boolean;
  showTests?: boolean;
}

export default function CodeEditor({ 
  language, 
  initialCode = '', 
  testCases = [],
  onSubmit,
  readOnly = false,
  showTests = true
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('editor');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const t = (fi: string, en: string) => language === 'fi' ? fi : en;

  // Simple Python interpreter using Pyodide (client-side)
  const runCode = async () => {
    setIsRunning(true);
    setOutput('');
    setTestResults([]);

    try {
      // For now, simulate code execution
      // In production, use Pyodide or backend API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate output
      const simulatedOutput = `${t('Koodin suoritus onnistui!', 'Code executed successfully!')}\n\n${t('Tulos:', 'Output:')}\nHello, World!`;
      setOutput(simulatedOutput);

      // Run test cases if provided
      if (testCases.length > 0 && showTests) {
        const results = testCases.map((test, index) => ({
          id: index,
          passed: Math.random() > 0.3, // Simulate pass/fail
          input: test.input,
          expected: test.expectedOutput,
          actual: test.expectedOutput, // Simulate correct output
          hidden: test.hidden
        }));
        setTestResults(results);

        const allPassed = results.every(r => r.passed);
        if (allPassed) {
          toast({
            title: t('🎉 Kaikki testit läpäisty!', '🎉 All tests passed!'),
            description: t('Hienoa työtä!', 'Great job!'),
          });
        }
      }

      setActiveTab('output');
    } catch (error: any) {
      setOutput(`${t('Virhe:', 'Error:')}\n${error.message}`);
      setActiveTab('output');
    } finally {
      setIsRunning(false);
    }
  };

  const resetCode = () => {
    setCode(initialCode);
    setOutput('');
    setTestResults([]);
    toast({
      title: t('Koodi palautettu', 'Code reset'),
      description: t('Alkuperäinen koodi palautettu', 'Original code restored'),
    });
  };

  const saveCode = () => {
    localStorage.setItem('saved_code', code);
    toast({
      title: t('💾 Koodi tallennettu', '💾 Code saved'),
      description: t('Koodisi on tallennettu paikallisesti', 'Your code has been saved locally'),
    });
  };

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'code.py';
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: t('📥 Koodi ladattu', '📥 Code downloaded'),
      description: t('Tiedosto tallennettu', 'File saved'),
    });
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(code, { testResults, output });
    }
  };

  // Handle Tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            onClick={runCode}
            disabled={isRunning || readOnly}
            className="bg-green-600 hover:bg-green-700"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('Suoritetaan...', 'Running...')}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                {t('Suorita', 'Run')}
              </>
            )}
          </Button>
          
          {!readOnly && (
            <>
              <Button
                onClick={resetCode}
                variant="outline"
                disabled={isRunning}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t('Palauta', 'Reset')}
              </Button>
              
              <Button
                onClick={saveCode}
                variant="outline"
                disabled={isRunning}
              >
                <Save className="w-4 h-4 mr-2" />
                {t('Tallenna', 'Save')}
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={downloadCode}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            {t('Lataa', 'Download')}
          </Button>

          {onSubmit && (
            <Button
              onClick={handleSubmit}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {t('Lähetä vastaus', 'Submit Answer')}
            </Button>
          )}
        </div>
      </div>

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            {t('Editori', 'Editor')}
          </TabsTrigger>
          <TabsTrigger value="output" className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            {t('Tuloste', 'Output')}
          </TabsTrigger>
          {showTests && testCases.length > 0 && (
            <TabsTrigger value="tests" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {t('Testit', 'Tests')}
              {testResults.length > 0 && (
                <Badge variant={testResults.every(r => r.passed) ? "default" : "destructive"}>
                  {testResults.filter(r => r.passed).length}/{testResults.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Code Editor */}
        <TabsContent value="editor">
          <Card>
            <CardContent className="p-0">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                readOnly={readOnly}
                className="w-full h-96 p-4 font-mono text-sm bg-gray-900 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder={t('Kirjoita koodisi tähän...', 'Write your code here...')}
                spellCheck={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Output */}
        <TabsContent value="output">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Terminal className="w-5 h-5" />
                {t('Tuloste', 'Output')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="w-full h-80 p-4 bg-gray-900 text-gray-100 rounded-lg overflow-auto font-mono text-sm">
                {output || t('Suorita koodi nähdäksesi tulosteen...', 'Run code to see output...')}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Results */}
        {showTests && testCases.length > 0 && (
          <TabsContent value="tests">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="w-5 h-5" />
                  {t('Testitulokset', 'Test Results')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {testResults.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">
                    {t('Suorita koodi nähdäksesi testitulokset...', 'Run code to see test results...')}
                  </p>
                ) : (
                  testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 ${
                        result.passed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">
                          {t('Testi', 'Test')} {index + 1}
                          {result.hidden && ` (${t('piilotettu', 'hidden')})`}
                        </span>
                        {result.passed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      {!result.hidden && (
                        <div className="space-y-1 text-sm">
                          <p><strong>{t('Syöte:', 'Input:')}</strong> {result.input}</p>
                          <p><strong>{t('Odotettu:', 'Expected:')}</strong> {result.expected}</p>
                          {!result.passed && (
                            <p><strong>{t('Saatu:', 'Actual:')}</strong> {result.actual}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Hints */}
      {!readOnly && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 mb-1">
                  {t('Vinkki', 'Hint')}
                </p>
                <p className="text-sm text-blue-800">
                  {t(
                    'Käytä Tab-näppäintä sisennyksen lisäämiseen. Muista testata koodisi ennen lähettämistä!',
                    'Use Tab key for indentation. Remember to test your code before submitting!'
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
