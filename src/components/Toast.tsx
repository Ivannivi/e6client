import { cn } from '../utils';
import type { Toast as ToastType } from '../hooks/useToast';

interface Props {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

const TOAST_ICONS = {
  success: 'fa-check-circle',
  error: 'fa-exclamation-circle',
  warning: 'fa-exclamation-triangle',
  info: 'fa-info-circle',
};

const TOAST_COLORS = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
};

export function ToastContainer({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white animate-slide-in',
            TOAST_COLORS[toast.type]
          )}
          onClick={() => onRemove(toast.id)}
        >
          <i className={`fas ${TOAST_ICONS[toast.type]}`} />
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(toast.id);
            }}
            className="text-white/80 hover:text-white"
          >
            <i className="fas fa-times" />
          </button>
        </div>
      ))}
    </div>
  );
}
