import React, { ReactNode, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin' || user.email !== 'joaquin.grimoldi@kavak.com')) {
      toast({
        title: "Access Denied",
        description: "Admin access restricted to authorized personnel only.",
        variant: "destructive",
      });
      setLocation('/');
    }
  }, [user, isLoading, toast, setLocation]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Hide content if not admin or not joaquin.grimoldi@kavak.com
  if (!user || user.role !== 'admin' || user.email !== 'joaquin.grimoldi@kavak.com') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600">Admin access restricted to authorized personnel only.</p>
        </div>
      </div>
    );
  }

  // Show content if user is admin
  return <>{children}</>;
}