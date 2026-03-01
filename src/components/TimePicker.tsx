/**
 * مكون اختيار الوقت: يتيح اختيار الساعة والدقائق بشكل مخصص
 */

import React, { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";

interface TimePickerProps {
  value: string; // Format: "HH:mm"
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export default function TimePicker({ value, onChange, disabled = false, placeholder = "00:00", className = "" }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

  const [currentH, currentM] = value ? value.split(":") : ["08", "00"];

  const handleSelect = (h: string, m: string) => {
    onChange(`${h}:${m}`);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer transition-all ${
          disabled 
            ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed" 
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-durra-green"
        } ${isOpen ? "ring-2 ring-durra-green border-durra-green" : ""}`}
      >
        <Clock className={`w-4 h-4 ${disabled ? "text-gray-400" : "text-durra-green"}`} />
        <span className={`text-sm font-mono ${!value ? "text-gray-400" : "text-gray-700 dark:text-gray-200"}`}>
          {value || placeholder}
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex gap-3 h-48">
            {/* Hours */}
            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1">
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 sticky top-0 bg-white dark:bg-gray-800 py-1">الساعة</div>
              {hours.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleSelect(h, currentM)}
                  className={`w-full py-1 text-sm rounded-lg transition-colors ${
                    currentH === h 
                      ? "bg-durra-green text-white font-bold" 
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
            {/* Minutes */}
            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1 border-r border-gray-100 dark:border-gray-700 pr-2">
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 sticky top-0 bg-white dark:bg-gray-800 py-1">الدقيقة</div>
              {minutes.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelect(currentH, m)}
                  className={`w-full py-1 text-sm rounded-lg transition-colors ${
                    currentM === m 
                      ? "bg-durra-green text-white font-bold" 
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <span className="text-xs font-bold text-durra-green">{currentH}:{currentM}</span>
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              تم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
