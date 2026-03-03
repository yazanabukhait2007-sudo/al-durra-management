import React from "react";
import { AlertCircle } from "lucide-react";

interface ValidationTooltipProps {
  message?: string;
  className?: string;
}

export default function ValidationTooltip({ 
  message = "يُرجى ملء هذا الحقل.", 
  className = "" 
}: ValidationTooltipProps) {
  return (
    <div className={`absolute top-full mt-2 right-0 z-20 w-full min-w-[200px] ${className}`}>
      <div className="relative bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
        {/* Arrow */}
        <div className="absolute -top-2 right-6 w-4 h-4 bg-white dark:bg-gray-800 border-t border-l border-gray-200 dark:border-gray-700 transform rotate-45"></div>
        
        {/* Icon */}
        <div className="bg-orange-500 rounded-md p-1 shrink-0">
          <AlertCircle className="w-5 h-5 text-white" />
        </div>
        
        {/* Text */}
        <span className="text-gray-800 dark:text-gray-200 font-medium text-sm">{message}</span>
      </div>
    </div>
  );
}
