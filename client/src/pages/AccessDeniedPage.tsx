import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Mail } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">Access Restricted</CardTitle>
          <CardDescription className="text-gray-600">
            This application is restricted to Kavak team members only.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <Mail className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              Please sign in with your <strong>@kavak.com</strong> email address to access this application.
            </p>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              Try Again
            </Button>
            <p className="text-xs text-gray-500">
              If you believe this is an error, please contact your system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}