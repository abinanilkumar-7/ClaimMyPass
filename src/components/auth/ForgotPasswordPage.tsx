
import React, { useState } from 'react';
import { ArrowLeft, Film, LoaderCircle, Mail } from 'lucide-react';
import { requestPasswordReset } from '../../services/authApi';

interface Props {
  onBack: () => void;
}

export const ForgotPasswordPage: React.FC<Props> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const inputClass =
    'w-full rounded-xl border border-[#7FA35C]/30 bg-[#101511] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#FFD900] focus:ring-1 focus:ring-[#FFD900]/30';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to process your request. Please try again.'
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
          onClick={onBack}
          className="mb-7 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </button>

        <div className="rounded-2xl border border-[#7FA35C]/20 bg-[#080E09] p-6 shadow-2xl sm:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FFD900]/20 bg-[#FFD900]/10">
              {submitted ? (
                <Mail className="h-7 w-7 text-[#FFD900]" />
              ) : (
                <Film className="h-7 w-7 text-[#FFD900]" />
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-white">
              {submitted ? 'Check your email' : 'Forgot your password?'}
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {submitted
                ? 'If an account exists for that email, a reset link will be sent. Check your inbox.'
                : 'Enter the email associated with your ClaimMyPass account and we will send you a reset link if the account exists.'}
            </p>
          </div>

          {!submitted && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-email"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Email address
                </label>

                <input
                  id="reset-email"
                  className={inputClass}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD900] px-4 py-3 font-bold text-[#080E09] transition hover:bg-[#FFFC72] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                {loading ? 'Sending request...' : 'Send reset link'}
              </button>
            </form>
          )}

          {submitted && (
            <button
              type="button"
              onClick={onBack}
              className="w-full rounded-xl bg-[#FFD900] px-4 py-3 font-bold text-[#080E09] hover:bg-[#FFFC72]"
            >
              Return to sign in
            </button>
          )}
        </div>
      </section>
    </main>
  );
};
