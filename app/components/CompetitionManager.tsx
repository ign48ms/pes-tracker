"use client";
import React, { useState, useMemo } from "react";
import { useApp } from "../lib/AppContext";
import type { Competition, CompetitionFormat, CompetitionTemplate } from "../lib/types";
import { LEAGUE_SYSTEMS, COMP_FORMAT_LABELS, getKnockoutRoundName, templateToCompetition, getCompColor, COMP_COLOR_PALETTE } from "../lib/constants";

export default function CompetitionManager() {
  const { competitions, addCompetition, removeCompetition, updateCompetition, matches } = useApp();

  // Expanded league sections
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());
  // Show custom comp form
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customFormat, setCustomFormat] = useState<CompetitionFormat>("league");
  const [customKORounds, setCustomKORounds] = useState("4");
  const [customKOLegs, setCustomKOLegs] = useState<1 | 2>(1);
  const [customSLFinal, setCustomSLFinal] = useState(false);
  const [customGroupGames, setCustomGroupGames] = useState("6");
  const [customGroupKORounds, setCustomGroupKORounds] = useState("4");

  // Color picker state: comp ID whose picker is currently open
  const [colorPickerOpen, setColorPickerOpen] = useState<number | null>(null);

  // Set of predefinedIds that are currently enabled
  const enabledPredefinedIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of competitions) {
      if (c.predefinedId) set.add(c.predefinedId);
    }
    return set;
  }, [competitions]);

  // Map of competition names used in matches (to warn before removal)
  const usedCompNames = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      if (m.competition) set.add(m.competition);
    }
    return set;
  }, [matches]);

  const toggleSystem = (id: string) => {
    setExpandedSystems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const enableTemplate = (template: CompetitionTemplate) => {
    const comp = templateToCompetition(template);
    addCompetition(comp);
  };

  const disableTemplate = (templateId: string) => {
    const comp = competitions.find(c => c.predefinedId === templateId);
    if (!comp) return;
    removeCompetition(comp.id);
  };

  const handleAddCustom = () => {
    const name = customName.trim();
    if (!name || competitions.some(c => c.name === name)) return;
    const comp: Competition = {
      id: Date.now() + (crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000),
      name,
      format: customFormat,
    };
    if (customFormat === "knockout") {
      comp.knockoutRounds = Math.max(1, Number(customKORounds) || 4);
      comp.knockoutLegs = customKOLegs;
      if (customKOLegs === 2) comp.singleLegFinal = customSLFinal;
    } else if (customFormat === "group-knockout") {
      comp.groupGames = Math.max(1, Number(customGroupGames) || 6);
      comp.groupKnockoutRounds = Math.max(1, Number(customGroupKORounds) || 4);
      comp.knockoutLegs = customKOLegs;
      if (customKOLegs === 2) comp.singleLegFinal = customSLFinal;
    }
    addCompetition(comp);
    setCustomName("");
    setCustomFormat("league");
    setCustomKOLegs(1);
    setCustomSLFinal(false);
    setShowCustom(false);
  };

  const togglePreliminary = (compId: number, current: boolean) => {
    if (current) {
      updateCompetition(compId, { hasPreliminaryRound: false, preliminaryLegs: undefined });
    } else {
      // Find the template to get default preliminary legs
      const comp = competitions.find(c => c.id === compId);
      const template = comp?.predefinedId
        ? LEAGUE_SYSTEMS.flatMap(s => s.templates).find(t => t.templateId === comp.predefinedId)
        : null;
      updateCompetition(compId, {
        hasPreliminaryRound: true,
        preliminaryLegs: template?.defaultPreliminaryLegs || 1,
      });
    }
  };

  const setPreliminaryLegs = (compId: number, legs: 1 | 2) => {
    updateCompetition(compId, { preliminaryLegs: legs });
  };

  // Custom competitions (no predefinedId)
  const customCompetitions = competitions.filter(c => !c.predefinedId);

  // Get format description
  const getFormatDesc = (t: CompetitionTemplate): string => {
    if (t.format === "league") return "League";
    if (t.format === "freetext") return "Custom rounds";
    if (t.format === "group-knockout") {
      const parts = [`${t.groupGames || 6} group games`];
      const koR = t.groupKnockoutRounds || 4;
      parts.push(`${koR} KO rounds`);
      if (t.knockoutLegs === 2) parts.push("two-legged");
      if (t.singleLegFinal) parts.push("single-leg final");
      return parts.join(", ");
    }
    if (t.format === "knockout") {
      const koR = t.knockoutRounds || 4;
      const parts: string[] = [];
      if (koR === 1) {
        parts.push("1 match");
      } else {
        parts.push(`${getKnockoutRoundName(koR)} → Final`);
      }
      if (t.knockoutLegs === 2) parts.push("two-legged");
      if (t.singleLegFinal) parts.push("single-leg final");
      if (t.supportsPreliminary) parts.push("optional prelim");
      return parts.join(", ");
    }
    return COMP_FORMAT_LABELS[t.format];
  };

  return (
    <div className="space-y-4">
      {/* Competition Catalogue */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700">
          <p className="text-xs text-slate-500">
            Enable competitions from the catalogue or create custom ones. Toggle the preliminary round for domestic cups where applicable.
          </p>
        </div>

        {LEAGUE_SYSTEMS.map(sys => {
          // Don't show the "General" section in the catalogue (Friendly is always-on)
          if (sys.id === "gen") return null;
          const isExpanded = expandedSystems.has(sys.id);
          const enabledCount = sys.templates.filter(t => enabledPredefinedIds.has(t.templateId)).length;

          return (
            <div key={sys.id} className="border-b border-slate-700/50 last:border-b-0">
              <button
                onClick={() => toggleSystem(sys.id)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-700/30 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{sys.flag}</span>
                  <span className="text-sm font-semibold text-slate-200">{sys.name}</span>
                  {enabledCount > 0 && (
                    <span className="text-[10px] font-bold bg-blue-600/30 text-blue-400 px-1.5 py-0.5 rounded">
                      {enabledCount}/{sys.templates.length}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-5 pb-3 space-y-1">
                  {sys.templates.map(template => {
                    const isEnabled = enabledPredefinedIds.has(template.templateId);
                    const comp = isEnabled
                      ? competitions.find(c => c.predefinedId === template.templateId)
                      : null;
                    const isUsed = comp ? usedCompNames.has(comp.name) : false;
                    const isFriendly = template.templateId === "gen-friendly";
                    const colors = getCompColor(template.name, comp?.colorKey);

                    return (
                      <div key={template.templateId} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-900/50">
                        {/* Toggle */}
                        <button
                          onClick={() => {
                            if (isFriendly) return;
                            if (isEnabled) disableTemplate(template.templateId);
                            else enableTemplate(template);
                          }}
                          disabled={isFriendly}
                          className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${
                            isEnabled ? "bg-blue-600" : "bg-slate-600"
                          } ${isFriendly ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <span className={`absolute left-0 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            isEnabled ? "translate-x-[1.125rem]" : "translate-x-0.5"
                          }`} />
                        </button>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${isEnabled ? "text-slate-200" : "text-slate-500"}`}>
                              {template.name}
                            </span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${colors.text} ${colors.bg} ${colors.border}`}>
                              {COMP_FORMAT_LABELS[template.format]}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-600 mt-0.5">{getFormatDesc(template)}</p>
                        </div>

                        {/* Warning if removing a used competition */}
                        {isEnabled && isUsed && (
                          <span className="text-[9px] text-amber-500 flex-shrink-0" title="This competition has matches">
                            ⚠ in use
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Competitions & Config */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Active Competitions</h3>
        {competitions.length === 0 && (
          <p className="text-sm text-slate-600 italic">No competitions enabled. Enable some from the catalogue above.</p>
        )}
        <div className="space-y-2">
          {competitions.map(comp => {
            const colors = getCompColor(comp.name, comp.colorKey);
            const template = comp.predefinedId
              ? LEAGUE_SYSTEMS.flatMap(s => s.templates).find(t => t.templateId === comp.predefinedId)
              : null;
            const supportsPrelim = template?.supportsPreliminary || false;
            const isUsed = usedCompNames.has(comp.name);
            const isFriendly = comp.predefinedId === "gen-friendly";

            return (
              <div key={comp.id} className="bg-slate-900/50 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${colors.text}`}>{comp.name}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${colors.text} ${colors.bg} ${colors.border}`}>
                        {COMP_FORMAT_LABELS[comp.format]}
                      </span>
                      {comp.knockoutLegs === 2 && (
                        <span className="text-[9px] font-bold text-indigo-400 bg-indigo-900/30 border border-indigo-800/50 px-1.5 py-0.5 rounded">
                          TWO-LEGGED
                        </span>
                      )}
                      {comp.singleLegFinal && (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-800/50 px-1.5 py-0.5 rounded">
                          SINGLE-LEG FINAL
                        </span>
                      )}
                      {comp.hasPreliminaryRound && (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-900/30 border border-amber-800/50 px-1.5 py-0.5 rounded">
                          +PRELIM ({comp.preliminaryLegs === 2 ? "2 legs" : "1 leg"})
                        </span>
                      )}
                    </div>
                  </div>
                  {!isFriendly && (
                    <button
                      onClick={() => removeCompetition(comp.id)}
                      className="text-slate-600 hover:text-red-400 transition flex-shrink-0"
                      title={isUsed ? "Warning: matches use this competition" : "Remove competition"}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Color picker */}
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Color</span>
                    <button
                      onClick={() => setColorPickerOpen(colorPickerOpen === comp.id ? null : comp.id)}
                      className="w-5 h-5 rounded-full border-2 border-slate-600 hover:border-slate-400 transition flex-shrink-0"
                      style={{ backgroundColor: COMP_COLOR_PALETTE.find(p => p.key === comp.colorKey)?.swatch || COMP_COLOR_PALETTE.find(p => {
                        const resolved = getCompColor(comp.name);
                        return resolved.text === p.color.text;
                      })?.swatch || "#94a3b8" }}
                      title="Change color"
                    />
                    {comp.colorKey && (
                      <button
                        onClick={() => updateCompetition(comp.id, { colorKey: undefined })}
                        className="text-[9px] text-slate-500 hover:text-slate-300 transition"
                      >Reset</button>
                    )}
                  </div>
                  {colorPickerOpen === comp.id && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {COMP_COLOR_PALETTE.map(opt => {
                        const isActive = comp.colorKey === opt.key;
                        return (
                          <button
                            key={opt.key}
                            onClick={() => {
                              updateCompetition(comp.id, { colorKey: isActive ? undefined : opt.key });
                              setColorPickerOpen(null);
                            }}
                            className={`w-6 h-6 rounded-full border-2 transition hover:scale-110 ${
                              isActive ? "border-white scale-110" : "border-slate-600 hover:border-slate-400"
                            }`}
                            style={{ backgroundColor: opt.swatch }}
                            title={opt.label}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Preliminary round toggle for supported comps */}
                {supportsPrelim && (
                  <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <button
                        onClick={() => togglePreliminary(comp.id, !!comp.hasPreliminaryRound)}
                        className={`w-8 h-4 rounded-full relative transition-colors ${
                          comp.hasPreliminaryRound ? "bg-amber-600" : "bg-slate-600"
                        }`}
                      >
                        <span className={`absolute left-0 top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                          comp.hasPreliminaryRound ? "translate-x-[1.125rem]" : "translate-x-0.5"
                        }`} />
                      </button>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Preliminary Round</span>
                    </label>
                    {comp.hasPreliminaryRound && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">Legs:</span>
                        <select
                          value={comp.preliminaryLegs || 1}
                          onChange={e => setPreliminaryLegs(comp.id, Number(e.target.value) as 1 | 2)}
                          className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-slate-300 focus:outline-none focus:border-blue-500"
                        >
                          <option value={1}>1 leg</option>
                          <option value={2}>2 legs</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Competition Creation */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className="w-full py-2.5 text-sm font-semibold text-blue-400 hover:text-blue-300 border border-dashed border-slate-600 hover:border-blue-500 rounded-lg transition"
          >
            + Create Custom Competition
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddCustom(); } }}
                placeholder="Competition name..."
                className="flex-1 bg-slate-900 p-2.5 rounded border border-slate-700 focus:outline-none focus:border-green-500 transition text-sm"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-xs font-bold text-slate-500 uppercase">Format</label>
              <select
                value={customFormat}
                onChange={e => setCustomFormat(e.target.value as CompetitionFormat)}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
              >
                {(Object.entries(COMP_FORMAT_LABELS) as [CompetitionFormat, string][]).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              {(customFormat === "knockout" || customFormat === "group-knockout") && (
                <>
                  {customFormat === "knockout" && (
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Rounds</label>
                      <input
                        type="number" min="1" max="10"
                        value={customKORounds}
                        onChange={e => setCustomKORounds(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-16 text-sm text-center text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[10px] text-slate-600">
                        ({Number(customKORounds) > 0 ? getKnockoutRoundName(Number(customKORounds)) : "..."} → Final)
                      </span>
                    </div>
                  )}
                  {customFormat === "group-knockout" && (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Group Games</label>
                        <input
                          type="number" min="1" max="20"
                          value={customGroupGames}
                          onChange={e => setCustomGroupGames(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-16 text-sm text-center text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">KO Rounds</label>
                        <input
                          type="number" min="1" max="10"
                          value={customGroupKORounds}
                          onChange={e => setCustomGroupKORounds(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-16 text-sm text-center text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">KO Legs</label>
                    <select
                      value={customKOLegs}
                      onChange={e => setCustomKOLegs(Number(e.target.value) as 1 | 2)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
                    >
                      <option value={1}>Single leg</option>
                      <option value={2}>Two-legged</option>
                    </select>
                  </div>
                  {customKOLegs === 2 && (
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={customSLFinal}
                        onChange={e => setCustomSLFinal(e.target.checked)}
                        className="accent-blue-500"
                      />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Single-leg final</span>
                    </label>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddCustom}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded transition"
              >Add Competition</button>
              <button
                type="button"
                onClick={() => { setShowCustom(false); setCustomName(""); }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold rounded transition"
              >Cancel</button>
            </div>
          </div>
        )}

        {/* Show existing custom competitions */}
        {customCompetitions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Custom Competitions</p>
            <div className="space-y-1">
              {customCompetitions.map(comp => {
                const colors = getCompColor(comp.name, comp.colorKey);
                const isUsed = usedCompNames.has(comp.name);
                return (
                  <div key={comp.id} className="flex items-center justify-between py-1.5 px-3 rounded bg-slate-900/30">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${colors.text}`}>{comp.name}</span>
                      <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded border ${colors.text} ${colors.bg} ${colors.border}`}>
                        {COMP_FORMAT_LABELS[comp.format]}
                      </span>
                    </div>
                    <button
                      onClick={() => removeCompetition(comp.id)}
                      className="text-slate-600 hover:text-red-400 transition"
                      title={isUsed ? "Warning: matches use this competition" : "Remove"}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
