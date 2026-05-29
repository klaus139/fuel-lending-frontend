import { useCallback, useEffect, useId, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type QrCameraScannerProps = {
  active: boolean
  onScan: (payload: string) => void
  onError?: (message: string) => void
}

export function QrCameraScanner({ active, onScan, onError }: QrCameraScannerProps) {
  const reactId = useId().replace(/:/g, '')
  const containerId = `qr-camera-${reactId}`
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const handledRef = useRef(false)
  const onScanRef = useRef(onScan)
  const onErrorRef = useRef(onError)

  onScanRef.current = onScan
  onErrorRef.current = onError

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    if (!scanner) return

    try {
      if (scanner.isScanning) {
        await scanner.stop()
      }
      scanner.clear()
    } catch {
      // ignore cleanup errors
    } finally {
      scannerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!active) {
      handledRef.current = false
      void stopScanner()
      return
    }

    handledRef.current = false
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner

    void scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          if (handledRef.current) return
          handledRef.current = true
          onScanRef.current(decodedText.trim())
        },
        () => {},
      )
      .catch((error: unknown) => {
        onErrorRef.current?.(
          error instanceof Error ? error.message : 'Could not open camera. Use HTTPS or allow camera access.',
        )
      })

    return () => {
      void stopScanner()
    }
  }, [active, containerId, stopScanner])

  if (!active) return null

  return (
    <div className="overflow-hidden rounded-xl border border-(--border) bg-black">
      <div id={containerId} className="w-full [&_video]:!rounded-xl" />
    </div>
  )
}
