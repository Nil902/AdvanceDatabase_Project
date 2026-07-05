import React, { useState, useEffect, useRef } from 'react';
import type { FormEvent, KeyboardEvent, ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, ShieldCheck, Clock } from 'lucide-react';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [timeLeft, setTimeLeft] = useState<number>(268); 
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const location = useLocation();
  const navigate = useNavigate();
  const rawEmail = location.state?.email || "pos***@gmail.com";

  const maskEmail = (emailStr: string): string => {
    const [name, domain] = emailStr.split('@');
    if (!domain) return emailStr;
    const visibleLength = Math.min(3, name.length);
    return `${name.substring(0, visibleLength)}***@${domain}`;
  };

  const maskedEmail = maskEmail(rawEmail);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigate("/reset-password");
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased selection:bg-blue-500 selection:text-white">
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

      <div className="flex w-full flex-col justify-between p-8 lg:w-1/2 lg:p-12">
        <div className="hidden lg:block"></div>

        <div className="mx-auto w-full max-w-md space-y-8">
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
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1 text-center">
                <h3 className="text-base font-bold text-slate-900">Verify Your Identity</h3>
                <p className="text-xs leading-relaxed text-slate-500 max-w-sm mx-auto">
                  A 6-digit secure code has been sent to your registered email (<strong className="text-slate-700">{maskedEmail}</strong>). Enter it below to proceed.
                </p>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={digit}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    onChange={(e) => handleChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="h-12 w-full text-center rounded-lg border border-slate-200 bg-slate-50/50 text-lg font-bold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                ))}
              </div>

              <div className="flex flex-col items-center justify-center space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Code expires in <strong className="text-slate-900 font-bold">{formatTime(timeLeft)}</strong></span>
                </div>
                {timeLeft === 0 && (
                  <button type="button" className="text-blue-800 font-bold hover:underline bg-transparent border-none p-0 outline-none cursor-pointer">
                    Resend Code
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 py-3 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-slate-900 active:bg-slate-950"
              >
                <ShieldCheck className="h-4 w-4 stroke-[2.5]" />
                Verify & Proceed
              </button>
            </form>

            <div className="mt-5 flex items-center justify-center">
              <a href="/forgot-password" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 hover:underline transition">
                <ArrowLeft className="h-3.5 w-3.5 stroke-[2.5]" />
                Back to enter Email
              </a>
            </div>
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