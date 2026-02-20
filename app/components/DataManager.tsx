"use client";
import React, { useState, useRef } from "react";
import CustomModal from "./CustomModal";
import type { ModalConfig, ExportData, Player, Match } from "../lib/types";
import { useApp } from "../lib/AppContext";
import { exportAllData } from "../lib/storage";

export default function DataManager() {
  const { importData: ctxImport, clearAll: ctxClearAll } = useApp();
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [importPreview, setImportPreview] = useState<ExportData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shape-validation predicates
  const isValidPlayer = (p: unknown): p is Player =>
    typeof p === "object" && p !== null &&
    "id" in p && "name" in p && "position" in p &&
    typeof (p as Record<string, unknown>).id === "number" &&
    typeof (p as Record<string, unknown>).name === "string" &&
    typeof (p as Record<string, unknown>).position === "string";

  const isValidMatch = (m: unknown): m is Match =>
    typeof m === "object" && m !== null &&
    "id" in m && "myScore" in m && "opScore" in m && "opponent" in m &&
    typeof (m as Record<string, unknown>).id === "number" &&
    typeof (m as Record<string, unknown>).opponent === "string";

  const handleExport = () => {
    const data = exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pes-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setModal({
      title: "Export Complete",
      message: "Your data has been downloaded as a JSON file.",
      type: "success",
      confirmText: "OK",
      onConfirm: () => setModal(null),
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportPreview(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as ExportData;

        // Structural validation
        if (!data.version || !Array.isArray(data.players) || !Array.isArray(data.matches)) {
          setImportError("Invalid file format. Expected a PES Tracker backup file.");
          return;
        }

        // Shape validation — catch corrupted or mismatched backups early
        const badPlayers = data.players.filter(p => !isValidPlayer(p));
        if (badPlayers.length > 0) {
          setImportError(`Import failed: ${badPlayers.length} player record(s) have missing or invalid fields (id, name, position required).`);
          return;
        }
        const badMatches = data.matches.filter(m => !isValidMatch(m));
        if (badMatches.length > 0) {
          setImportError(`Import failed: ${badMatches.length} match record(s) have missing or invalid fields (id, opponent, myScore, opScore required).`);
          return;
        }

        setImportPreview(data);
      } catch {
        setImportError("Failed to parse file. Please select a valid JSON backup file.");
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!importPreview) return;

    setModal({
      title: "Confirm Import",
      message: `This will REPLACE all current data with:\n${importPreview.players.length} players, ${importPreview.matches.length} matches, ${importPreview.seasons?.length || 0} seasons, ${importPreview.competitions?.length || 0} competitions.${importPreview.teamName ? `\nTeam name: ${importPreview.teamName}` : ""}\n\nThis cannot be undone.`,
      type: "danger",
      confirmText: "Import & Replace",
      onConfirm: () => {
        ctxImport(
          importPreview.players || [],
          importPreview.matches || [],
          importPreview.seasons || [],
          importPreview.competitions || [],
          importPreview.teamName
        );
        setImportPreview(null);
        setImportError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setModal({
          title: "Import Complete",
          message: "Data has been imported successfully.",
          type: "success",
          confirmText: "OK",
          onConfirm: () => {
            setModal(null);
          },
        });
      },
    });
  };

  const handleClearAll = () => {
    setModal({
      title: "Reset All Data",
      message: "This will PERMANENTLY DELETE all players, matches, seasons, and competitions. This action cannot be undone. Consider exporting your data first.",
      type: "danger",
      confirmText: "Delete Everything",
      onConfirm: () => {
        ctxClearAll();
        setModal({
          title: "Data Cleared",
          message: "All data has been removed.",
          type: "success",
          confirmText: "OK",
          onConfirm: () => {
            setModal(null);
          },
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Export Data</h3>
        <p className="text-xs text-slate-500 mb-4">
          Download all your data (players, matches, seasons, competitions) as a JSON backup file.
        </p>
        <button
          onClick={handleExport}
          className="bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-lg font-bold text-sm transition active:scale-95"
        >
          Export Backup
        </button>
      </div>

      {/* Import */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Import Data</h3>
        <p className="text-xs text-slate-500 mb-4">
          Restore from a previously exported backup file. This will replace all current data.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-slate-700 file:text-slate-300 hover:file:bg-slate-600 file:cursor-pointer file:transition"
        />
        {importError && (
          <p className="text-red-400 text-sm mt-3 bg-red-900/20 border border-red-800/40 rounded-lg p-3">{importError}</p>
        )}
        {importPreview && (
          <div className="mt-4 p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
            <p className="text-sm font-bold text-slate-300 mb-2">Preview:</p>
            {importPreview.teamName && (
              <p className="text-sm text-slate-300 mb-3">Team: <span className="font-bold">{importPreview.teamName}</span></p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
              <div>
                <p className="text-lg font-black text-slate-200">{importPreview.players.length}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Players</p>
              </div>
              <div>
                <p className="text-lg font-black text-slate-200">{importPreview.matches.length}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Matches</p>
              </div>
              <div>
                <p className="text-lg font-black text-slate-200">{importPreview.seasons?.length || 0}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Seasons</p>
              </div>
              <div>
                <p className="text-lg font-black text-slate-200">{importPreview.competitions?.length || 0}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Competitions</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mb-3">
              Exported: {importPreview.exportDate ? new Date(importPreview.exportDate).toLocaleString() : "Unknown"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmImport}
                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-bold text-sm transition"
              >
                Import Data
              </button>
              <button
                onClick={() => {
                  setImportPreview(null);
                  setImportError(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-bold text-sm text-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset */}
      <div className="bg-slate-800 border border-red-900/30 rounded-xl p-5">
        <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-3">Danger Zone</h3>
        <p className="text-xs text-slate-500 mb-4">
          Permanently delete all data. This cannot be undone.
        </p>
        <button
          onClick={handleClearAll}
          className="bg-red-900/30 text-red-400 border border-red-800/50 hover:bg-red-800/50 px-5 py-2.5 rounded-lg font-bold text-sm transition"
        >
          Reset All Data
        </button>
      </div>

      <CustomModal config={modal} onClose={() => setModal(null)} />
    </div>
  );
}
