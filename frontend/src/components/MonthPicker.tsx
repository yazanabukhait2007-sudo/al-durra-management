import React from 'react';

const MonthPicker = ({ selected, onChange }: any) => {
  return <input type="month" value={selected} onChange={(e) => onChange(e.target.value)} />;
};

export default MonthPicker;
