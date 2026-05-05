import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Github, Star, GitFork, Code, Users } from "lucide-react";

export default function GitHubApp({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Github className="w-5 h-5 text-white" />
          <span className="font-semibold text-white">GitHub</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-gray-800">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <Github className="w-20 h-20 mx-auto mb-4 text-white" />
            <h2 className="text-3xl font-bold text-white mb-2">GitHub</h2>
            <p className="text-gray-400">Koodin versionhallinta ja yhteistyö</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-6 bg-[#161b22] border-gray-800 hover:bg-[#1c2128] transition-colors">
              <Code className="w-8 h-8 text-blue-500 mb-3" />
              <h3 className="font-bold text-white mb-2">Repositoriot</h3>
              <p className="text-sm text-gray-400">Selaa projektejasi</p>
            </Card>
            <Card className="p-6 bg-[#161b22] border-gray-800 hover:bg-[#1c2128] transition-colors">
              <Users className="w-8 h-8 text-green-500 mb-3" />
              <h3 className="font-bold text-white mb-2">Tiimit</h3>
              <p className="text-sm text-gray-400">Yhteistyö muiden kanssa</p>
            </Card>
          </div>

          <Card className="p-6 bg-[#161b22] border-gray-800">
            <h3 className="font-bold text-white mb-4">Suositut repositoriot</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-[#0d1117] rounded-lg border border-gray-800">
                  <h4 className="font-bold text-white mb-2">projekti-{i}</h4>
                  <p className="text-sm text-gray-400 mb-3">Kuvaus projektista</p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4" /> 42
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-4 h-4" /> 12
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
