import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, ArrowLeft, ArrowRight, RotateCw } from "lucide-react";

export default function WebBrowserApp() {
  const [url, setUrl] = useState("https://www.google.com");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const navigate = (newUrl: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setUrl(newUrl);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setUrl(history[historyIndex - 1]);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setUrl(history[historyIndex + 1]);
    }
  };

  const refresh = () => {
    // Refresh iframe
    const iframe = document.querySelector("iframe");
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="bg-gray-100 border-b p-2 flex gap-2 items-center">
        <Button
          size="sm"
          variant="outline"
          onClick={goBack}
          disabled={historyIndex <= 0}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={goForward}
          disabled={historyIndex >= history.length - 1}
          className="h-8 w-8 p-0"
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={refresh}
          className="h-8 w-8 p-0"
        >
          <RotateCw className="w-4 h-4" />
        </Button>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              let newUrl = url;
              if (!newUrl.startsWith("http")) {
                newUrl = "https://" + newUrl;
              }
              navigate(newUrl);
            }
          }}
          className="flex-1 h-8 text-sm"
          placeholder="Enter URL..."
        />
      </div>
      <iframe
        src={url}
        className="flex-1 border-0 w-full"
        title="Web Browser"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  );
}
