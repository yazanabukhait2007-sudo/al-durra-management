import React from 'react';

const CustomDatePicker = ({ selected, onChange }: any) => {
  return (
    <input 
      type="date" 
      value={selected} 
      onChange={(e) => onChange(e.target.value)}
      className="border p-2 rounded"
    />
  );
};

export default CustomDatePicker;
