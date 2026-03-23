import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  route("participant/dashboard", "routes/participant/dashboard.tsx"),
  route("researcher/dashboard", "routes/researcher/dashboard.tsx")
] satisfies RouteConfig;

// route("participant/dashboard/study/:id", "routes/participant/study.$id.tsx"),