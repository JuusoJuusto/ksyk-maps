import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Folder, Search, GitBranch, Settings, Play } from "lucide-react";

export default function VSCodeApp() {
  const [code, setCode] = useState(`// Welcome to VS Code
function hello() {
  console.log("Hello, World!");
}

hello();`);

  const files = [
    { name: "index.html", icon: "📄" },
    { name: "style.css", icon: "🎨" },
    { name: "script.js", icon: "📜" },
    { name: "README.md", icon: "📖" },
  ];

  return (
    <div className="h-full flex bg-[#1e1e1e] text-white">
      {/* Activity Bar */}
      <div className="w-12 bg-[#333333] flex flex-col items-center py-2 gap-4">
        <Button variant="ghost" size="icon" className="text-white hover:bg-[#2a2a2a]">
          <FileText className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white hover:bg-[#2a2a2a]">
          <Search className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white hover:bg-[#2a2a2a]">
          <GitBranch className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white hover:bg-[#2a2a2a] mt-auto">
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <div className="w-64 bg-[#252526] flex flex-col">
        <div className="p-3 border-b border-[#3e3e42]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400">EXPLORER</span>
            <Button variant="ghost" size="icon" className="w-6 h-6">
              <Folder className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-sm font-semibold">MY PROJECT</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#2a2d2e] cursor-pointer"
            >
              <span>{file.icon}</span>
              <span className="text-sm">{file.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {/* Tab Bar */}
        <div className="bg-[#2d2d2d] border-b border-[#3e3e42] flex items-center px-2">
          <div className="px-4 py-2 bg-[#1e1e1e] border-r border-[#3e3e42] flex items-center gap-2">
            <span>📜</span>
            <span className="text-sm">script.js</span>
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 p-4 font-mono text-sm overflow-auto">
          <div className="flex">
            <div className="w-12 text-right pr-4 text-gray-500 select-none">
              {code.split("\n").map((_, idx) => (
                <div key={idx}>{idx + 1}</div>
              ))}
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 bg-transparent text-white outline-none resize-none font-mono"
              style={{ minHeight: "100%" }}
            />
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-[#007acc] px-4 py-1 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              <span>main</span>
            </div>
            <span>JavaScript</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Ln 1, Col 1</span>
            <span>UTF-8</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 hover:bg-[#005a9e]">
              <Play className="w-3 h-3 mr-1" />
              Run
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
