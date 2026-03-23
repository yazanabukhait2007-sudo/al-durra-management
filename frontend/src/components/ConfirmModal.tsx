import React from 'react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow-lg">
        <h2 className="text-xl font-bold">{title}</h2>
        <p>{message}</p>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">إلغاء</button>
          <button onClick={onConfirm} className="bg-red-500 text-white px-4 py-2 rounded">تأكيد</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
