"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SeasonManager from "../components/SeasonManager";
import TeamManager from "../components/TeamManager";
import CompetitionManager from "../components/CompetitionManager";
const DataManager = dynamic(() => import("../components/DataManager"), { ssr: false });
import { useApp } from "../lib/AppContext";
import { FORMATION_NAMES } from "../lib/constants";

export default function SettingsPage() {
  const { teamName, setTeamName, defaultFormation, setDefaultFormation } = useApp();
  const [nameInput, setNameInput] = useState(teamName);
  const [formationInput, setFormationInput] = useState(defaultFormation);

  useEffect(() => { setNameInput(teamName); }, [teamName]);
  useEffect(() => { setFormationInput(defaultFormation); }, [defaultFormation]);

  const handleSaveFormation = () => {
    setDefaultFormation(formationInput);
  };

  const handleSaveTeamName = () => {
    setTeamName(nameInput.trim());
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-400 tracking-tight mb-8">Settings</h1>

        {/* Team Name */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-green-500 rounded-full"></span>
            Team Name
          </h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-3">Your custom team name appears on the dashboard and in match forms.</p>
            <div className="flex items-center gap-3">
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveTeamName(); }}
                placeholder="e.g. FC Barcelona, My Team..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
                maxLength={50}
              />
              <button
                onClick={handleSaveTeamName}
                disabled={nameInput.trim() === teamName}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold rounded transition"
              >
                Save
              </button>
              {teamName && (
                <button
                  onClick={() => { setNameInput(""); setTeamName(""); }}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs font-bold rounded transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-orange-500 rounded-full"></span>
            Preferences
          </h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-4">Choose the default formation shown when adding a new match.</p>
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-300 whitespace-nowrap">Default Formation</label>
              <select
                value={formationInput}
                onChange={e => setFormationInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
              >
                {FORMATION_NAMES.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <button
                onClick={handleSaveFormation}
                disabled={formationInput === defaultFormation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold rounded transition"
              >
                Save
              </button>
            </div>
          </div>
        </section>

        {/* Competition Management */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-red-500 rounded-full"></span>
            Competition Management
          </h2>
          <CompetitionManager />
        </section>

        {/* Season Management */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>
            Season Management
          </h2>
          <SeasonManager />
        </section>
        {/* Team Management */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>
            Team Management
          </h2>
          <TeamManager />
        </section>

        {/* Data Management */}
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-purple-500 rounded-full"></span>
            Data Management
          </h2>
          <DataManager />
        </section>
      </div>
    </main>
  );
}
