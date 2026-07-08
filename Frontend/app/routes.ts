import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("forgot-password", "routes/request-otp.tsx"),
  route("verify-identity", "routes/verify-otp.tsx"),
  route("reset-password", "routes/forgot-password.tsx"),
  
  // ── Admin Portal ─────────────────────────────────────────────────────
  route("admin", "routes/admin/index.tsx"), // <-- Catch /admin and redirect them
  route("admin/dashboard", "routes/admin/dashboard.tsx"),
  // ── Registrar Portal (NIMS Portal) ──────────────────────────────────
  route("registrar", "routes/registrar/layout.tsx", [
    index("routes/registrar/demographic-report.tsx"),
    route("birth-certificate", "routes/registrar/birth-certificate.tsx"),
    route("national-id", "routes/registrar/national-id.tsx"),
    route("residency-book", "routes/registrar/residency-book.tsx"),
    route("family-management", "routes/registrar/family-management.tsx"),
  ]),
] satisfies RouteConfig;