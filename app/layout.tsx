import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import { AppProvider } from "./lib/AppContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "MyPES Tracker",
    template: "%s | MyPES",
  },
  description: "Track your PES Master League squad and match history",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-900 text-slate-100`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold">
          Skip to content
        </a>
        <AppProvider>
          <NavBar />
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
        </AppProvider>
      </body>
    </html>
  );
}