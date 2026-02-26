import React from "react";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Diamond */}
      <div className="w-5 h-5 bg-white rotate-45 mb-[-10px] z-10 shadow-sm"></div>
      {/* Oval */}
      <div className="bg-durra-red text-white font-black text-3xl px-8 py-2 rounded-[100%] border-4 border-white shadow-md relative z-0 flex items-center justify-center tracking-tight">
        Durra<sup className="text-[10px] ml-1 font-normal mt-[-10px]">®</sup>
      </div>
    </div>
  );
}
