import { useState } from "react";
import { Shield, User, Eye, EyeOff, LogIn, Fingerprint } from "lucide-react";

export function meta() {
  return [
    { title: "Login - NIMS" },
    { name: "description", content: "National Identity Management System Login" },
  ];
}

export default function NIMSLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("••••••••••••");

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50">
      {/* Left panel */}
      <div className="relative hidden md:flex md:w-1/2 lg:w-[45%] overflow-hidden bg-slate-950">
        {/* Circuit board backdrop */}
        <svg
          className="absolute inset-0 w-full h-full opacity-40"
          viewBox="0 0 800 1000"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0 L0 0 0 40" fill="none" stroke="#1e3a5f" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="800" height="1000" fill="url(#grid)" />
          {[...Array(14)].map((_, i) => (
            <path
              key={i}
              d={`M${50 + i * 55} 0 L${50 + i * 55} ${200 + (i % 5) * 60} L${
                50 + i * 55 + (i % 2 === 0 ? 40 : -40)
              } ${260 + (i % 5) * 60} L${50 + i * 55 + (i % 2 === 0 ? 40 : -40)} 1000`}
              fill="none"
              stroke="#3b6ea5"
              strokeWidth="1.5"
              opacity="0.35"
            />
          ))}
        </svg>

        {/* Fingerprint centerpiece */}
        <div className="relative z-10 m-auto">
          <Fingerprint className="w-64 h-64 text-slate-300/70" strokeWidth={0.6} />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-slate-950/70" />

        {/* Bottom copy */}
        <div className="absolute bottom-0 left-0 right-0 p-12 z-20">
          <h2 className="text-white text-4xl font-bold tracking-tight mb-4">
            Digital Sovereignty
          </h2>
          <p className="text-slate-300 text-base leading-relaxed max-w-md">
            The foundation of trust starts with a secure identity. NIMS
            ensures every citizen is accounted for with military-grade
            encryption and administrative precision.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Logo / heading */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mb-4 shadow-lg">
              <Shield className="w-8 h-8 text-white" fill="white" strokeWidth={1} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">NIMS</h1>
            <p className="text-xs font-semibold tracking-widest text-slate-500 mt-1">
              NATIONAL IDENTITY MANAGEMENT SYSTEM
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
              className="space-y-6"
            >
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-bold tracking-wide text-slate-700 mb-2"
                >
                  ADMINISTRATOR USERNAME
                </label>
                <div className="relative">
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your email or username"
                    className="w-full rounded-lg border border-indigo-100 bg-indigo-50/40 px-4 py-3 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition"
                  />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-indigo-100 bg-indigo-50/40 px-4 py-3 pr-10 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end -mt-2">
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-sm font-medium text-blue-700 hover:text-blue-800 transition"
                >
                  Forgot Password?
                </a>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 transition shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>

              <div className="flex items-center gap-4 pt-2">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-bold tracking-widest text-slate-400">
                  SECURE BIOMETRICS
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 space-y-1">
            <p className="text-xs text-slate-500">
              System Version 4.2.0-LTS • Regional Access Zone: North
            </p>
            <p className="text-xs text-slate-400">
              © 2024 National Identity Management Authority. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}