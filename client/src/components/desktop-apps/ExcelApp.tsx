import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Save, Download, Upload, Table } from "lucide-react";

export default function ExcelApp() {
  const [data, setData] = useState([
    ["Name", "Grade", "Subject", "Score"],
    ["Emma Wilson", "9A", "Math", "95"],
    ["John Smith", "9A", "Math", "87"],
    ["Sarah Johnson", "9B", "Math", "92"],
    ["", "", "", ""],
  ]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b p-2 flex items-center gap-2 bg-gray-50">
        <Button size="sm" className="bg-green-600 hover:bg-green-700">
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button size="sm" variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button size="sm" variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>
        <div className="border-l h-6 mx-2" />
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add Row
        </Button>
        <Button size="sm" variant="outline">
          <Table className="w-4 h-4 mr-2" />
          Format
        </Button>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="w-12 border border-gray-300 p-2 text-xs font-semibold">#</th>
              {["A", "B", "C", "D", "E", "F", "G", "H"].map((col) => (
                <th key={col} className="border border-gray-300 p-2 text-xs font-semibold min-w-[120px]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td className="border border-gray-300 p-2 text-xs text-center bg-gray-100 font-semibold">
                  {rowIdx + 1}
                </td>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="border border-gray-300 p-0">
                    <Input
                      value={cell}
                      onChange={(e) => {
                        const newData = [...data];
                        newData[rowIdx][cellIdx] = e.target.value;
                        setData(newData);
                      }}
                      className="border-0 rounded-none h-8 text-sm focus:ring-2 focus:ring-green-500"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status Bar */}
      <div className="border-t p-2 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
        <div>Sheet1</div>
        <div>Ready</div>
      </div>
    </div>
  );
}
