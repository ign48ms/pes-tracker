"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/squad", label: "Squad" },
  { href: "/matches", label: "Matches" },
  { href: "/opponents", label: "Opponents" },
  { href: "/settings", label: "Settings" },
];

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-blue-500 font-black tracking-tighter text-xl hover:text-blue-400 transition">
            MyPES
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex gap-6 text-sm font-bold uppercase tracking-widest">
            {NAV_LINKS.map(link => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition ${isActive ? "text-blue-400" : "text-slate-400 hover:text-blue-400"}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Hamburger button (mobile) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="sm:hidden flex flex-col gap-1.5 p-2 -mr-2"
          aria-label="Toggle navigation"
          aria-expanded={isOpen}
        >
          <span className={`w-5 h-0.5 bg-slate-400 transition-all ${isOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`w-5 h-0.5 bg-slate-400 transition-all ${isOpen ? "opacity-0" : ""}`} />
          <span className={`w-5 h-0.5 bg-slate-400 transition-all ${isOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`sm:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur-md ${isOpen ? "" : "hidden"}`} aria-hidden={!isOpen}>
          <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col gap-3">
            {NAV_LINKS.map(link => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`text-sm font-bold uppercase tracking-widest py-2 transition ${isActive ? "text-blue-400" : "text-slate-400 hover:text-blue-400"}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
    </nav>
  );
}
