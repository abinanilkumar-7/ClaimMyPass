
import React, { useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Film,
  LoaderCircle,
} from 'lucide-react';
import { confirmPasswordReset } from '../../services/authApi';

interface Props {
  onBackToSignIn: () => void;
}

export const ResetPasswordPage: React.FC<Props> = ({
  onBackToSignIn,
}) => {
  const params = new URLSearchParams(window.location.search);
  const uid = params.get('uid') ?? '';
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const inputClass =
    'w-full rounded-xl border border-[#7FA35C]/30 bg-[#101511] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#FFD900] focus:ring-1 focus:ring-[#FFD900]/30';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!uid || !token) {
      setError('This reset link is invalid or incomplete. Request a new link.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Your passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset({
        uid,
        token,
        password,
        password_confirm: passwordConfirm,
      });

      setSuccess(true);
      setPassword('');
      setPasswordConfirm('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reset your password. Request a new link if necessary.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[75vh] flex items-center justify-center bg-[#101511] px-4 py-12">
      <section className="w-full max-w-md">
        <button
          type="button"
          onClick={onBackToSignIn}
          className="mb-7 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </button>

        <div className="rounded-2xl border border-[#7FA35C]/20 bg-[#080E09] p-6 shadow-2xl sm:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FFD900]/20 bg-[#FFD900]/10">
              <Film className="h-7 w-7 text-[#FFD900]" />
            </div>

            <h1 className="text-2xl font-extrabold text-white">
              {success ? 'Password updated' : 'Create a new password'}
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              {success
                ? 'Your password has been changed. Sign in with your new password.'
                : 'Choose a strong password for your ClaimMyPass account.'}
            </p>
          </div>

          {success ? (
            <button
              type="button"
              onClick={onBackToSignIn}
              className="w-full rounded-xl bg-[#FFD900] px-4 py-3 font-bold text-[#080E09] hover:bg-[#FFFC72]"
            >
              Sign in
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  New password
                </label>

                <div className="relative">
                  <input
                    id="new-password"
                    className={`${inputClass} pr-12`}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-new-password"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Confirm new password
                </label>

                <input
                  id="confirm-new-password"
                  className={inputClass}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  minLength={8}
                  required
                />
              </div>

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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD900] px-4 py-3 font-bold text-[#080E09] hover:bg-[#FFFC72] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                {loading ? 'Updating password...' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};
