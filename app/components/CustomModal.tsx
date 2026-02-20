"use client";
import React, { useEffect, useRef, useCallback } from 'react';
import type { ModalConfig } from '../lib/types';

export default function CustomModal({ 
  config, 
  onClose 
}: { 
  config: ModalConfig | null; 
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap and Escape handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!config) return;
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "Tab" && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [config, onClose]);

  useEffect(() => {
    if (!config) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    document.addEventListener("keydown", handleKeyDown);
    // Focus first button in modal
    requestAnimationFrame(() => {
      const btn = dialogRef.current?.querySelector<HTMLElement>('button');
      btn?.focus();
    });
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [config, handleKeyDown]);

  if (!config) return null;

  const { title, message, type, confirmText, cancelText, onConfirm } = config;

  const icons = {
    success: { symbol: "✓", bg: "bg-green-900/50", border: "border-green-500/50", text: "text-green-400" },
    confirm: { symbol: "?", bg: "bg-blue-900/50", border: "border-blue-500/50", text: "text-blue-400" },
    danger:  { symbol: "!", bg: "bg-red-900/50", border: "border-red-500/50", text: "text-red-400" },
  };
  const ic = icons[type];

  const btnStyle = {
    success: "bg-green-600 hover:bg-green-500",
    confirm: "bg-blue-600 hover:bg-blue-500",
    danger:  "bg-red-600 hover:bg-red-500",
  };

  const showCancel = type !== "success";

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={`w-14 h-14 rounded-full ${ic.bg} border-2 ${ic.border} flex items-center justify-center`}>
            <span className={`text-2xl font-black ${ic.text}`}>{ic.symbol}</span>
          </div>
        </div>

        {/* Title */}
        <h3 id="modal-title" className="text-lg font-bold text-slate-200 text-center mb-2">{title}</h3>
        
        {/* Message */}
        <p className="text-sm text-slate-400 text-center mb-6 leading-relaxed">{message}</p>

        {/* Buttons */}
        <div className={`flex gap-3 ${!showCancel ? "justify-center" : ""}`}>
          {showCancel && (
            <button
              onClick={onClose}
              className="flex-1 basis-0 py-2.5 rounded-lg font-semibold text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 transition border border-slate-600 text-center"
            >
              {cancelText || "Cancel"}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`${showCancel ? "flex-1 basis-0" : "px-8"} py-2.5 rounded-lg font-semibold text-sm text-white transition text-center ${btnStyle[type]}`}
          >
            {confirmText || (type === "success" ? "OK" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
