/**
 * Python Code Runner using Pyodide
 * Executes Python code in the browser
 */

let pyodideInstance: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

export async function loadPyodide() {
  if (pyodideInstance) {
    return pyodideInstance;
  }

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      // @ts-ignore - Pyodide is loaded from CDN
      const pyodide = await window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
      });
      
      pyodideInstance = pyodide;
      isLoading = false;
      return pyodide;
    } catch (error) {
      isLoading = false;
      loadPromise = null;
      throw error;
    }
  })();

  return loadPromise;
}

export interface PythonExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}

export async function runPythonCode(code: string, input?: string): Promise<PythonExecutionResult> {
  const startTime = performance.now();
  
  try {
    const pyodide = await loadPyodide();
    
    // Capture stdout
    let output = '';
    pyodide.setStdout({
      batched: (text: string) => {
        output += text + '\n';
      }
    });
    
    // If there's input, mock stdin
    if (input) {
      const inputLines = input.split('\n');
      let inputIndex = 0;
      
      pyodide.globals.set('input', () => {
        if (inputIndex < inputLines.length) {
          return inputLines[inputIndex++];
        }
        return '';
      });
    }
    
    // Run the code
    await pyodide.runPythonAsync(code);
    
    const executionTime = performance.now() - startTime;
    
    return {
      success: true,
      output: output.trim(),
      executionTime: Math.round(executionTime)
    };
  } catch (error: any) {
    const executionTime = performance.now() - startTime;
    
    return {
      success: false,
      error: error.message || 'Unknown error',
      executionTime: Math.round(executionTime)
    };
  }
}

export async function runPythonTests(
  code: string, 
  testCases: Array<{ input: string; expectedOutput: string; hidden?: boolean }>
): Promise<{
  allPassed: boolean;
  results: Array<{
    passed: boolean;
    input: string;
    expectedOutput: string;
    actualOutput?: string;
    error?: string;
    hidden?: boolean;
  }>;
  executionTime: number;
}> {
  const startTime = performance.now();
  const results = [];
  
  for (const testCase of testCases) {
    const result = await runPythonCode(code, testCase.input);
    
    const actualOutput = result.output?.trim() || '';
    const expectedOutput = testCase.expectedOutput.trim();
    const passed = result.success && actualOutput === expectedOutput;
    
    results.push({
      passed,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: result.output,
      error: result.error,
      hidden: testCase.hidden
    });
  }
  
  const executionTime = performance.now() - startTime;
  const allPassed = results.every(r => r.passed);
  
  return {
    allPassed,
    results,
    executionTime: Math.round(executionTime)
  };
}

export function isPyodideLoaded(): boolean {
  return pyodideInstance !== null;
}

export function isPyodideLoading(): boolean {
  return isLoading;
}
