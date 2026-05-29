import { Link } from 'react-router-dom'
import { API_BASE } from '../api/qr-demo'
import { Button, Card, PageHeader } from '../components/ui'

export function TestQrCodePage() {
  return (
    <div className="min-h-screen bg-(--bg-primary) p-4 md:p-8">
      <div className="mx-auto max-w-lg">
        <PageHeader
          title="QR Disbursement Demo"
          description="Use two devices like production: merchant creates a QR, customer scans independently."
          actions={
            <Link to="/" className="text-sm font-medium text-emerald-500">
              Admin
            </Link>
          }
        />

        <Card className="space-y-4 p-6">
          <p className="text-sm text-(--text-secondary)">
            Merchant and customer flows are fully separate. The API connects them only when the
            customer scans a valid QR and confirms payment.
          </p>

          <Link to="/demo/qr/merchant" className="block">
            <Button type="button" className="w-full py-3">
              🏪 Open Merchant POS (device 1)
            </Button>
          </Link>

          <Link to="/demo/qr/customer" className="block">
            <Button type="button" variant="secondary" className="w-full py-3">
              📱 Open Customer app (device 2)
            </Button>
          </Link>

          <p className="text-xs text-(--text-muted)">
            API: <code className="rounded bg-(--bg-hover) px-1">{API_BASE}</code>
            <br />
            Customer needs fuel credit: run <code>npm run seed:test-user</code> in the backend.
          </p>
        </Card>
      </div>
    </div>
  )
}
