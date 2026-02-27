import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft } from "lucide-react";

interface MonthPickerProps {
  value: string; // Format: "YYYY-MM"
  onChange: (value: string) => void;
}

const MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export default function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const [currentYear, currentMonth] = value.split("-").map(Number);
  const [viewYear, setViewYear] = useState(currentYear || new Date().getFullYear());

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

  const handleMonthSelect = (monthIndex: number) => {
    const formattedMonth = (monthIndex + 1).toString().padStart(2, "0");
    onChange(`${viewYear}-${formattedMonth}`);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return "اختر الشهر";
    const [y, m] = value.split("-").map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between pl-4 pr-11 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none bg-gray-50 text-gray-700 font-medium transition-all hover:border-durra-green/50 text-right"
      >
        <span>{getDisplayValue()}</span>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <CalendarIcon className="h-5 w-5 text-durra-green" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setViewYear(viewYear - 1)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            <span className="font-bold text-gray-800">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear(viewYear + 1)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((monthName, index) => {
              const isSelected = viewYear === currentYear && index + 1 === currentMonth;
              return (
                <button
                  key={monthName}
                  type="button"
                  onClick={() => handleMonthSelect(index)}
                  className={`py-2 px-1 text-sm rounded-lg transition-colors ${
                    isSelected
                      ? "bg-durra-green text-white font-bold shadow-sm"
                      : "hover:bg-durra-green/10 text-gray-700"
                  }`}
                >
                  {monthName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
