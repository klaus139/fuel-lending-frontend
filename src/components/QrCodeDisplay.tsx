type QrCodeDisplayProps = {
  value: string
  size?: number
  title?: string
}

/** Renders a scannable QR via a reliable image service (works for long JWT payloads). */
export function QrCodeDisplay({ value, size = 260, title = 'Fuel payment QR code' }: QrCodeDisplayProps) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(value)}`

  return (
    <div className="flex flex-col items-center">
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-white p-3 shadow-lg">
        <img
          src={src}
          alt={title}
          width={size}
          height={size}
          className="block"
          style={{ width: size, height: size, imageRendering: 'pixelated' }}
        />
      </div>
      <p className="mt-2 text-xs text-(--text-muted)">Scan with customer app or use Scan &amp; pay below</p>
    </div>
  )
}
