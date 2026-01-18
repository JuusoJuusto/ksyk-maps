import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import UltimateKSYKBuilder from "@/components/UltimateKSYKBuilder";

export default function KSYKBuilderPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin-ksyk-management-portal">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">KSYK Campus Builder</h1>
                <p className="text-sm text-gray-600">Design and manage your campus layout</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Builder Content */}
      <div className="p-4">
        <UltimateKSYKBuilder />
      </div>
    </div>
  );
}
