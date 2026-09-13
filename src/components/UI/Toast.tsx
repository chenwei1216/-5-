import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

type Listener = (toast: ToastItem) => void;
const listeners = new Set<Listener>();
let seq = 0;

function emit(type: ToastType, message: string) {
  const item = { id: ++seq, type, message };
  listeners.forEach((fn) => fn(item));
}

export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message),
  info: (message: string) => emit('info', message),
};

const config: Record<ToastType, { icon: typeof Info; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'text-green-600' },
  error: { icon: XCircle, cls: 'text-red-600' },
  info: { icon: Info, cls: 'text-primary-600' },
};

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (item) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
      }, 2800);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const remove = (id: number) => setItems((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {items.map((item) => {
        const { icon: Icon, cls } = config[item.type];
        return (
          <div
            key={item.id}
            className="animate-slide-up pointer-events-auto flex items-center gap-2 bg-white shadow-lg border border-gray-100 rounded-full pl-4 pr-2 py-2.5 max-w-sm"
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${cls}`} />
            <span className="text-sm text-gray-700">{item.message}</span>
            <button
              onClick={() => remove(item.id)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
