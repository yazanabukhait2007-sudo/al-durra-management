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
  position?: "top" | "bottom";
}

export default function TimePicker({ 
  value, 
  onChange, 
  disabled = false, 
  placeholder = "00:00", 
  className = "",
  position = "bottom"
}: TimePickerProps) {
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
        <div className={`absolute z-50 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 animate-in fade-in duration-200 ${
          position === "top" 
            ? "bottom-full mb-2 slide-in-from-bottom-2" 
            : "top-full mt-2 slide-in-from-top-2"
        }`}>
          <div className="space-y-4">
            {/* Hours */}
            <div>
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">الساعة</div>
              <div className="grid grid-cols-6 gap-1">
                {hours.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      onChange(`${h}:${currentM}`);
                    }}
                    className={`h-8 text-sm rounded-lg transition-all flex items-center justify-center font-medium ${
                      currentH === h 
                        ? "bg-durra-green text-white shadow-sm" 
                        : "bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div>
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">الدقيقة</div>
              <div className="grid grid-cols-6 gap-1">
                {minutes.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      onChange(`${currentH}:${m}`);
                    }}
                    className={`h-8 text-sm rounded-lg transition-all flex items-center justify-center font-medium ${
                      currentM === m 
                        ? "bg-durra-green text-white shadow-sm" 
                        : "bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <span className="text-sm font-bold text-durra-green font-mono bg-durra-green/10 px-3 py-1 rounded-lg">
              {currentH}:{currentM}
            </span>
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
              تم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
