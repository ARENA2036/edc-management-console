import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Connector } from '../types';

interface Props {
  connector: Connector;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
}


export default function DeleteModal({
  connector,
  onClose,
  onConfirm,
  title = 'Delete Connector',
  message,
  cancelLabel = 'Cancel',
  confirmLabel = 'Delete',
}: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-slate-900">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-red-600">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="mb-6 text-gray-700 dark:text-slate-300">
          {message ?? (
            <>
              Are you sure you want to delete <strong>{connector.name}</strong>? This action cannot be undone.
            </>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
