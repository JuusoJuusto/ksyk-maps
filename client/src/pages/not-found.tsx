import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
      <Header />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="mb-6">
              <div className="text-9xl font-bold text-blue-600 mb-4">404</div>
              <div className="flex items-center justify-center gap-3 mb-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <h1 className="text-3xl font-bold text-gray-900">Page Not Found</h1>
              </div>
            </div>

            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
              Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <Button size="lg" className="w-full sm:w-auto">
                  <Home className="mr-2 h-5 w-5" />
                  Go Home
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => window.history.back()}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Go Back
              </Button>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Need help? <Link href="/" className="text-blue-600 hover:underline">Contact Support</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
