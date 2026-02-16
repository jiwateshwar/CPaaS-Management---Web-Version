import { useState, useCallback } from 'react';

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

let toastListeners: Array<(toast: ToastMessage) => void> = [];

let idCounter = 0;

export function toast(
  title: string,
  opts?: { description?: string; variant?: ToastVariant },
) {
  const msg: ToastMessage = {
    id: String(++idCounter),
    title,
    description: opts?.description,
    variant: opts?.variant ?? 'default',
  };
  toastListeners.forEach((fn) => fn(msg));
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((msg: ToastMessage) => {
    setToasts((prev) => [...prev, msg]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const subscribe = useCallback(() => {
    toastListeners.push(addToast);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== addToast);
    };
  }, [addToast]);

  return { toasts, removeToast, subscribe };
}
