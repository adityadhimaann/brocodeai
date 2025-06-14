import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, AlertTriangle } from 'lucide-react';

export default function MessageBox({ message, type, onClose }) {
  const bgColor = type === 'error' ? 'bg-red-800' : 'bg-blue-800';
  const textColor = 'text-white';
  const borderColor = type === 'error' ? 'border-red-600' : 'border-blue-600';
  const icon = type === 'error' ? <AlertTriangle className="h-6 w-6 mr-3 text-red-300" /> : <Info className="h-6 w-6 mr-3 text-blue-300" />;

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
          className=" top-4 left-1/2 -translate-x-1/2 z-50 p-2 rounded-lg shadow-2xl border-2"
          style={{ minWidth: '320px', maxWidth: '90%' }}
        >
          <div className={`${bgColor} ${textColor} border-l-4 ${borderColor} p-4 flex items-center justify-between rounded-md`}>
            <div className="flex items-center">
              {icon}
              <p className="text-base font-semibold">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 text-white hover:text-gray-200 focus:outline-none"
              aria-label="Close message"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}