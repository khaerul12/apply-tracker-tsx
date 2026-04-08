import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Briefcase, Mail } from 'lucide-react';
import { Navigate } from 'react-router-dom';

type AuthMode = 'signin' | 'signup' | 'reset';

export default function Login() {
  const { user, login, loginWithEmail, createAccountWithEmail, resetPassword, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
        await createAccountWithEmail(email, password);
      } else if (mode === 'reset') {
        await resetPassword(email);
        setMessage('Password reset email sent. Check your inbox.');
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      const authError = err as { message?: string };
      setError(authError.message || 'Unable to complete authentication.');
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Mail className="h-4 w-4" />
            <span>
              {mode === 'reset' 
                ? 'Reset your password' 
                : mode === 'signup' 
                  ? 'Create an account or sign in with email' 
                  : 'Sign in with your email'}
            </span>
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

              {mode !== 'reset' ? (
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
              ) : null}

              {mode === 'signup' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/90">Confirm Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {message ? <p className="text-sm text-success">{message}</p> : null}

              <Button type="submit" className="w-full h-12 text-lg">
                {mode === 'signup'
                  ? 'Create account'
                  : mode === 'reset'
                  ? 'Send password reset email'
                  : 'Sign in with Email'}
              </Button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-sm">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => {
                  setMode(mode === 'signup' ? 'signin' : 'signup');
                  setError('');
                  setMessage('');
                }}
              >
                {mode === 'signup' ? 'Already have an account? Sign in' : 'Create an account'}
              </button>
              {mode !== 'reset' ? (
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    setMode('reset');
                    setError('');
                    setMessage('');
                  }}
                >
                  Forgot password?
                </button>
              ) : (
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    setMode('signin');
                    setError('');
                    setMessage('');
                  }}
                >
                  Back to sign in
                </button>
              )}
            </div>

          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
