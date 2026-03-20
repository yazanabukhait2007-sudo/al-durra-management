import React from 'react';

const Logo = ({ className, noShadow }: { className?: string, noShadow?: boolean }) => {
  return <div className={`font-bold text-xl ${className}`}>Logo</div>;
};

export default Logo;
