import React from "react";
import { Calendar as CalendarIcon } from "lucide-react";

interface DatePickerProps {
  value: string; // Format: "YYYY-MM-DD"
  onChange: (value: string) => void;
  className?: string;
}

export default function DatePicker({ value, onChange, className = "" }: DatePickerProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-durra-green pointer-events-none" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pr-11 pl-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium transition-all hover:border-durra-green/50 text-right"
        />
      </div>
    </div>
  );
}
