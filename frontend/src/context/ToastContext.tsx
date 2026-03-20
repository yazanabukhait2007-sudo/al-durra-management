import React, { createContext, useContext, useState, ReactNode } from 'react';

const ToastContext = createContext<any>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const showToast = (message: string, type: string) => console.log(message, type);
  return <ToastContext.Provider value={{ showToast }}>{children}</ToastContext.Provider>;
};

export const useToast = () => useContext(ToastContext);
