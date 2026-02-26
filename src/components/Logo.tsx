import React from "react";

export default function Logo({ className = "", noShadow = false }: { className?: string, noShadow?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Diamond */}
      <div className={`w-5 h-5 bg-[#ffffff] rotate-45 mb-[-10px] z-10 ${noShadow ? '' : 'shadow-sm'}`}></div>
      {/* Oval */}
      <div className={`bg-[#ED1C24] text-[#ffffff] font-black text-3xl px-8 py-2 rounded-[100%] border-4 border-[#ffffff] relative z-0 flex items-center justify-center tracking-tight ${noShadow ? '' : 'shadow-md'}`}>
        Durra<sup className="text-[10px] ml-1 font-normal mt-[-10px]">®</sup>
      </div>
    </div>
  );
}
