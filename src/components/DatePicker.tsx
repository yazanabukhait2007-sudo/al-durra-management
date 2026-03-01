import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft } from "lucide-react";
import { format, parse, getDaysInMonth, startOfMonth, getDay, addMonths, subMonths, isSameDay } from "date-fns";
import { ar } from "date-fns/locale";

interface DatePickerProps {
  value: string; // Format: "YYYY-MM-DD"
  onChange: (value: string) => void;
  className?: string;
}

const WEEKDAYS = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export default function DatePicker({ value, onChange, className = "" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse current value or use today
  const currentDate = value ? parse(value, "yyyy-MM-dd", new Date()) : new Date();
  const [viewDate, setViewDate] = useState(currentDate);

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

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(format(selectedDate, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return "اختر التاريخ";
    return format(currentDate, "d MMMM yyyy", { locale: ar });
  };

  const daysInMonth = getDaysInMonth(viewDate);
  const firstDayOfMonth = getDay(startOfMonth(viewDate));

  const handlePrevMonth = () => setViewDate(subMonths(viewDate, 1));
  const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between pl-4 pr-11 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium transition-all hover:border-durra-green/50 text-right"
      >
        <span>{getDisplayValue()}</span>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <CalendarIcon className="h-5 w-5 text-durra-green" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full min-w-[280px] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <span className="font-bold text-gray-800 dark:text-white">
              {format(viewDate, "MMMM yyyy", { locale: ar })}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2"></div>
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateToCheck = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
              const isSelected = value && isSameDay(dateToCheck, currentDate);
              const isToday = isSameDay(dateToCheck, new Date());
              
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={`p-2 text-sm rounded-lg transition-colors flex items-center justify-center ${
                    isSelected
                      ? "bg-durra-green text-white font-bold shadow-sm"
                      : isToday
                      ? "bg-durra-green/10 text-durra-green font-bold hover:bg-durra-green/20"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
