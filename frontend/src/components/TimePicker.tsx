import React from 'react';

const TimePicker = ({ selected, onChange }: any) => {
  return <input type="time" value={selected} onChange={(e) => onChange(e.target.value)} />;
};

export default TimePicker;
