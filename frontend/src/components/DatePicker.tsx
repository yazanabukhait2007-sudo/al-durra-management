import React from 'react';

const DatePicker = ({ selected, onChange }: any) => {
  return <input type="date" value={selected} onChange={(e) => onChange(e.target.value)} />;
};

export default DatePicker;
