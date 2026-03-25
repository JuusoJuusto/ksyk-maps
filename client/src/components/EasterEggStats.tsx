import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Gamepad2, Code, Sparkles, Users, TrendingUp, Award } from "lucide-react";

export default function EasterEggStats() {
  const { data: stats } = useQuery({
    queryKey: ["easter-egg-stats"],
    queryFn: async () => {
      const response = await fetch("/api/easter-eggs/stats", {
        credentials: "include",
      });
      if (!response.ok) return null;
      return response.json();
    },
  });

  const easterEggs = [
    {
      id: "secret-easter-egg",
      name: "Original Easter Egg",
      icon: Trophy,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      description: "Found the secret page",
      reward: "Unlocks British English",
      found: stats?.secretEasterEgg || 0,
    },
    {
      id: "konami-code",
      name: "Konami Code",
      icon: Gamepad2,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      description: "↑↑↓↓←→←→BA",
      reward: "Retro gaming tribute",
      found: stats?.konamiCode || 0,
    },
    {
      id: "dev-mode",
      name: "Dev Mode",
      icon: Code,
      color: "text-green-600",
      bgColor: "bg-green-100",
      description: "Developer secrets",
      reward: "System information",
      found: stats?.devMode || 0,
    },
  ];

  const totalFound = easterEggs.reduce((sum, egg) => sum + egg.found, 0);
  const totalPossible = easterEggs.length;
  const uniqueUsers = stats?.uniqueUsers || 0;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-lg border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Discoveries</p>
                <p className="text-3xl font-bold text-blue-600">{totalFound}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Hunters</p>
                <p className="text-3xl font-bold text-purple-600">{uniqueUsers}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {uniqueUsers > 0 ? Math.round((totalFound / (uniqueUsers * totalPossible)) * 100) : 0}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Individual Easter Eggs */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-6 w-6" />
            Easter Egg Discovery Statistics
          </CardTitle>
          <CardDescription className="text-purple-100">
            Track how many users have found each hidden easter egg
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {easterEggs.map((egg) => (
              <div
                key={egg.id}
                className="border-2 rounded-lg p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-xl ${egg.bgColor}`}>
                      <egg.icon className={`h-8 w-8 ${egg.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{egg.name}</h3>
                        <Badge className="bg-blue-100 text-blue-800">
                          {egg.found} discoveries
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{egg.description}</p>
                      <p className="text-xs text-purple-600 font-semibold">
                        🎁 Reward: {egg.reward}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">{egg.found}</div>
                    <div className="text-xs text-gray-500">users found</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${egg.bgColor.replace('100', '500')}`}
                      style={{
                        width: uniqueUsers > 0 ? `${(egg.found / uniqueUsers) * 100}%` : '0%',
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {uniqueUsers > 0 ? Math.round((egg.found / uniqueUsers) * 100) : 0}% of users found this
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Leaderboard Hint */}
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Star className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="font-semibold text-gray-900">Easter Egg Hunters</p>
                <p className="text-sm text-gray-600">
                  {uniqueUsers} unique users have discovered at least one easter egg!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Discoveries */}
      {stats?.recentDiscoveries && stats.recentDiscoveries.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Recent Discoveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentDiscoveries.slice(0, 10).map((discovery: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <Trophy className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{discovery.easterEggName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(discovery.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">New!</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
