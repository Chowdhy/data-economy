import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import type { LinksFunction } from "react-router";
import "./app.css";

export const links: LinksFunction = () => [];

export default function App() {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <title>Consent Research Platform</title>
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
