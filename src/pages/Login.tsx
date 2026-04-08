import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, LogIn } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { user, login, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight">Welcome to ApplyWork</CardTitle>
            <CardDescription>
              Track your job applications, monitor progress, and land your dream job.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full h-12 text-lg" onClick={login}>
            <LogIn className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
