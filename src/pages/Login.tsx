import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Briefcase, LogIn, Mail } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { user, login, loginWithEmail, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      await loginWithEmail(email, password);
    } catch (err) {
      const authError = err as { message?: string };
      setError(authError.message || 'Failed to sign in with email.');
    }
  };

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

          <div className="border-t border-muted/50 pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Mail className="h-4 w-4" />
              <span>Or sign in with your email</span>
            </div>

            <form className="space-y-3" onSubmit={handleEmailSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/90">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/90">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button type="submit" className="w-full h-12 text-lg">
                Sign in with Email
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
