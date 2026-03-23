import React from 'react';

const ShippingModal = ({ isOpen, onClose, onConfirm }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow-lg">
        <h2 className="text-xl font-bold">تأكيد الشحن</h2>
        <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded mt-4">إلغاء</button>
        <button onClick={onConfirm} className="bg-blue-500 text-white px-4 py-2 rounded mt-4">شحن</button>
      </div>
    </div>
  );
};

export default ShippingModal;
