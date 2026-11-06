
import React, { useState } from 'react';
import { Film, Eye, EyeOff, ArrowLeft, LoaderCircle } from 'lucide-react';
import {
  login,
  signup,
  type AuthUser,
} from '../../services/authApi';

export type AuthMode = 'sign-in' | 'sign-up';

interface AuthPageProps {
  mode: AuthMode;
  onSwitchMode: (mode: AuthMode) => void;
  onSuccess: (user: AuthUser) => void;
  onBack: () => void;
  onForgotPassword?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  mode,
  onSwitchMode,
  onSuccess,
  onBack,
  onForgotPassword,
}) => {
  const isSignup = mode === 'sign-up';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (isSignup && password !== passwordConfirm) {
      setError('Your passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const result = isSignup
        ? await signup({
            name: name.trim(),
            email: email.trim(),
            password,
            password_confirm: passwordConfirm,
          })
        : await login({
            email: email.trim(),
            password,
          });

      onSuccess(result.user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#7FA35C]/30 bg-[#101511] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#FFD900] focus:ring-1 focus:ring-[#FFD900]/30';

  return (
    <main className="min-h-[75vh] flex items-center justify-center bg-[#101511] px-4 py-12">
      <section className="w-full max-w-md">
        <button
          type="button"
          onClick={onBack}
          className="mb-7 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to movies
        </button>

        <div className="rounded-2xl border border-[#7FA35C]/20 bg-[#080E09] p-6 shadow-2xl sm:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FFD900]/20 bg-[#FFD900]/10">
              <Film className="h-7 w-7 text-[#FFD900]" />
            </div>

            <h1 className="text-2xl font-extrabold text-white">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              {isSignup
                ? 'Join ClaimMyPass and make movie nights yours.'
                : 'Sign in to continue your movie experience.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label htmlFor="auth-name" className="mb-2 block text-sm font-medium text-zinc-300">
                  Full name
                </label>
                <input
                  id="auth-name"
                  className={inputClass}
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={150}
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="mb-2 block text-sm font-medium text-zinc-300">
                Email address
              </label>
              <input
                id="auth-email"
                className={inputClass}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="mb-2 block text-sm font-medium text-zinc-300">
                Password
              </label>

              <div className="relative">
                <input
                  id="auth-password"
                  className={`${inputClass} pr-12`}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {!isSignup && onForgotPassword && (
            <div className="-mt-1 flex justify-end">
            <button type="button" onClick={onForgotPassword}
            className="text-sm font-medium text-[#FFD900] transition hover:text-[#FFFC72]"
            >
              Forgot password?
            </button>
            </div>
            )}

            {isSignup && (
              <div>
                <label htmlFor="auth-confirm-password" className="mb-2 block text-sm font-medium text-zinc-300">
                  Confirm password
                </label>
                <input
                  id="auth-confirm-password"
                  className={inputClass}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD900] px-4 py-3 font-bold text-[#080E09] transition hover:bg-[#FFFC72] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {loading
                ? 'Please wait...'
                : isSignup
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-400">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => onSwitchMode(isSignup ? 'sign-in' : 'sign-up')}
              className="font-semibold text-[#FFD900] hover:text-[#FFFC72]"
            >
              {isSignup ? 'Sign in' : 'Sign up'}
            </button>
          </p>

          <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
            By continuing, you agree to ClaimMyPass's applicable terms and privacy policy.
          </p>
        </div>
      </section>
    </main>
  );
};
