import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function CalculatorApp() {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState(true);

  const handleNumber = (num: string) => {
    if (newNumber) {
      setDisplay(num);
      setNewNumber(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const handleOperation = (op: string) => {
    const current = parseFloat(display);
    
    if (previousValue === null) {
      setPreviousValue(current);
    } else if (operation) {
      const result = calculate(previousValue, current, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    }
    
    setOperation(op);
    setNewNumber(true);
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      const current = parseFloat(display);
      const result = calculate(previousValue, current, operation);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setNewNumber(true);
  };

  const handleDecimal = () => {
    if (!display.includes(".")) {
      setDisplay(display + ".");
      setNewNumber(false);
    }
  };

  const buttonClass = "h-14 text-lg font-semibold rounded-lg transition-all hover:scale-105 active:scale-95";

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="bg-gray-950 rounded-xl p-6 mb-4 shadow-inner">
        <div className="text-right text-4xl font-mono text-white break-all">
          {display}
        </div>
        {operation && (
          <div className="text-right text-sm text-gray-400 mt-2">
            {previousValue} {operation}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-4 gap-3 flex-1">
        <Button onClick={handleClear} className={`${buttonClass} bg-red-600 hover:bg-red-700 text-white`}>C</Button>
        <Button onClick={() => handleOperation("÷")} className={`${buttonClass} bg-blue-600 hover:bg-blue-700 text-white`}>÷</Button>
        <Button onClick={() => handleOperation("×")} className={`${buttonClass} bg-blue-600 hover:bg-blue-700 text-white`}>×</Button>
        <Button onClick={() => handleOperation("-")} className={`${buttonClass} bg-blue-600 hover:bg-blue-700 text-white`}>-</Button>
        
        <Button onClick={() => handleNumber("7")} className={`${buttonClass} bg-gray-700 hover:bg-gray-600 text-white`}>7</Button>
        <Button onClick={() => handleNumber("8")} className={`${buttonClass} bg-gray-700 hover:bg-gray-600 text-white`}>8</Button>
        <Button onClick={() => handleNumber("9")} className={`${buttonClass} bg-gray-700 hover:bg-gray-600 text-white`}>9</Button>
        <Button onClick={() => handleOperation("+")} className={`${buttonClass} bg-blue-600 hover:bg-blue-700 text-white row-span-2`}>+</Button>
        
        <Button onClick={() => handleNumber("4")} className={`${buttonClass} bg-gray-700 hover:bg-gray-600 text-white`}>4</Button>
        <Button onClick={() => handleNumber("5")} className={`${buttonClass} bg-gray-700 hover:bg-gray-600 text-white`}>5</Button>
        <Button onClick={() => handleNumber("6")} className={`${buttonClass} bg-gray-700 hover:bg-gray-600 text-white`}>6</Button>
        
        <Button onClick={() => handleNumber("1")} className={`${buttonClass} bg-gray-700 hover:bg-gray-600 text-white`}>1</Button>
        <Button onClick={() => handleNumber("2")} className={`${buttonClass} bg-gray-700 hover:bg-gray-600 text-white`}>2</Button>
        <Button onClick={() => handleNumber("3")} className={`${buttonClass} bg-gray-700 hover:bg-gray-600 text-white`}>3</Button>
        <Button onClick={handleEquals} className={`${buttonClass} bg-green-600 hover:bg-green-700 text-white row-span-2`}>=</Button>
        
        <Button onClick={() => handleNumber("0")} className={`${buttonClass} bg-gray-700 hover:bg-gray-600 text-white col-span-2`}>0</Button>
        <Button onClick={handleDecimal} className={`${buttonClass} bg-gray-700 hover:bg-gray-600 text-white`}>.</Button>
      </div>
    </div>
  );
}
