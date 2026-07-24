import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type ToastVariant = 'error' | 'success' | 'info'

type ToastItem = {
  id: number
  message: string
  variant: ToastVariant
}

type ToastContextValue = {
  toast: {
    error: (message: string) => void
    success: (message: string) => void
    info: (message: string) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, variant: ToastVariant) => {
    const id = ++toastId
    setItems((prev) => [...prev, { id, message, variant }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id))
    }, 5000)
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: {
        error: (message) => push(message, 'error'),
        success: (message) => push(message, 'success'),
        info: (message) => push(message, 'info'),
      },
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-100 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={[
              'pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur',
              item.variant === 'error' &&
                'border-red-500/40 bg-red-950/90 text-red-100',
              item.variant === 'success' &&
                'border-emerald-500/40 bg-emerald-950/90 text-emerald-100',
              item.variant === 'info' &&
                'border-sky-500/40 bg-sky-950/90 text-sky-100',
            ]
              .filter(Boolean)
              .join(' ')}
            role="status"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 font-semibold uppercase tracking-wide opacity-80">
                {item.variant}
              </span>
              <p className="flex-1 leading-snug">{item.message}</p>
              <button
                type="button"
                className="opacity-70 hover:opacity-100"
                onClick={() =>
                  setItems((prev) => prev.filter((t) => t.id !== item.id))
                }
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx.toast
}
