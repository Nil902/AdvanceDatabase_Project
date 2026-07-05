import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Eye, EyeOff, LogIn, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Safely extract secure transit states passed from VerifyOtpPage.tsx
  const email = location.state?.email || "";
  const otp = location.state?.otp || "";

  // Password Complexity Evaluation Flags
  const isLongEnough = password.length >= 12;
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumAndSpecial = /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
  const meetsAllCriteria = isLongEnough && hasMixedCase && hasNumAndSpecial;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Initial Guard Checks
    if (!email || !otp) {
      setError("Session context has expired. Please restart the password reset process.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The password confirmation field does not match.");
      return;
    }

    if (!meetsAllCriteria) {
      setError("Your proposed password does not satisfy NIMS security complexity profiles.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp,
          password,
          password_confirmation: confirmPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to commit password override transaction.");
      }

      setSuccess("Your administrative password has been rewritten successfully! Routing back to Login...");
      
      // Delay to let the user visually register successful completion
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err: any) {
      setError(err.message || "An unhandled server-side error occurred while updating your password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Left Column: Branding Decorative Background */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-slate-950 p-12 text-white lg:flex">
        <div className="absolute inset-0 opacity-20 mix-blend-luminosity">
          <img
            src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1600"
            alt="Intricate circuit board background"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="relative flex flex-1 items-center justify-center">
          <div className="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-8 backdrop-blur-sm shadow-2xl">
            <div className="relative flex h-64 w-64 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500/10 to-blue-500/10 p-4">
              <div className="absolute inset-0 flex items-center justify-center opacity-90 animate-pulse">
                <svg
                  className="h-48 w-48 text-cyan-400"
                  fill="none"
                  viewBox="0 0 100 100"
                  stroke="currentColor"
                  strokeWidth="0.75"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M50 10 C 30 20, 10 40, 10 60 C 10 80, 30 90, 50 90 C 70 90, 90 80, 90 60 C 90 40, 70 20, 50 10 Z M 50 10 C 60 25, 75 35, 90 45 M 50 10 C 40 25, 25 35, 10 45 M 50 40 A 10 10 0 1 1 50 60 A 10 10 0 1 1 50 40 Z"
                  />
                  <path
                    className="opacity-50"
                    d="M20 50 Q 30 30, 45 35 M80 50 Q 70 30, 55 35"
                    stroke="currentColor"
                  />
                </svg>
              </div>
              <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-xl"></div>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Digital Sovereignty
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            The foundation of trust starts with a secure identity. NIMS ensures
            every citizen is accounted for with military-grade encryption and
            administrative precision.
          </p>
        </div>
      </div>

      {/* Right Column: Interaction Form Panel */}
      <div className="flex w-full flex-col justify-between p-8 lg:w-1/2 lg:p-12">
        <div className="hidden lg:block"></div>

        <div className="mx-auto w-full max-w-md space-y-6">
          {/* Header Identity Branding */}
          <div className="flex flex-col items-center space-y-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white shadow-md">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">NIMS</h2>
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mt-0.5">
                National Identity Management System
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            {(!email || !otp) && !success ? (
              /* Session Interrupted / Empty Token Handler UI */
              <div className="space-y-4 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500 stroke-[1.5]" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Security Session Expired</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    To maintain defense compliance, password reset operations must be linked to active single-use verification tokens.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="w-full rounded-lg bg-slate-950 py-2.5 text-xs font-bold uppercase text-white transition hover:bg-slate-900"
                >
                  Restart Recovery Flow
                </button>
              </div>
            ) : (
              /* Active Password Entry Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Create New Password</h3>
                  <p className="text-xs leading-relaxed text-slate-500">
                    Please enter a highly secure password for your administrative account.
                  </p>
                </div>

                <hr className="border-slate-100" />

                {/* Server-Side Feedback Banners */}
                {error && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                    <AlertCircle className="h-4 w-4 shrink-0 stroke-[2.5]" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 stroke-[2.5]" />
                    <span>{success}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      disabled={isLoading || success !== null}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-3 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      required
                    />
                    <button
                      type="button"
                      disabled={isLoading || success !== null}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-55"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    disabled={isLoading || success !== null}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    required
                  />
                </div>

                {/* Live Constraint Rule Trackers */}
                <div className="rounded-lg bg-blue-50/50 border border-blue-100/50 p-4 space-y-2 text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Password Requirements:</span>
                  
                  <div className="flex items-center gap-2">
                    {isLongEnough ? (
                      <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                    <span className={isLongEnough ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                      At least 12 characters long
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasMixedCase ? (
                      <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                    <span className={hasMixedCase ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                      Upper & lowercase letters
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasNumAndSpecial ? (
                      <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                    <span className={hasNumAndSpecial ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                      Includes numbers & special characters
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || success !== null || !meetsAllCriteria}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 py-3 text-sm font-semibold text-white shadow transition hover:bg-slate-900 active:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating Record...
                    </>
                  ) : (
                    <>
                      Update Password & Login
                      <LogIn className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          <p>System Version 4.2.0-LTS &bull; Regional Access Zone: North</p>
          <p className="mt-1">&copy; 2024 National Identity Management Authority. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
}