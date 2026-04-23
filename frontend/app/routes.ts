import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("/", "routes/home.tsx"),
  route("/login", "routes/login.tsx"),
  route("/signup", "routes/signup.tsx"),
  route("/account", "routes/account.tsx"),

  route("/participant/dashboard", "routes/participant/dashboard.tsx"),
  route("/participant/discover", "routes/participant/discover.tsx"),
  route("/participant/studies", "routes/participant/studies.tsx"),
  route("/participant/profile", "routes/participant/profile.tsx"),

  route("/researcher/dashboard", "routes/researcher/dashboard.tsx"),
  //route("/researcher/fields", "routes/researcher/fields.tsx"),
  route("/researcher/studies", "routes/researcher/studies.tsx"),
  route("/researcher/create-study", "routes/researcher/create-study.tsx"),
  route("/researcher/studies/:studyId", "routes/researcher/study.$studyId.tsx"),

  route("/regulator/dashboard", "routes/regulator/dashboard.tsx"),
  route("/regulator/studies", "routes/regulator/studies.tsx"),
  route("/regulator/studies/:studyId", "routes/regulator/study.$studyId.tsx"),

] satisfies RouteConfig;
