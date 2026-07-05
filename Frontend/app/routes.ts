import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("forgot-password", "routes/request-otp.tsx"),
  route("verify-identity", "routes/verify-otp.tsx"),
  route("reset-password", "routes/forgot-password.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
] satisfies RouteConfig;