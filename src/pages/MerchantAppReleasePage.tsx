import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import { getApiErrorMessage } from '../api/client'
import {
  Button,
  Card,
  FormField,
  Input,
  PageHeader,
  Spinner,
  Textarea,
} from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { formatDateTime } from '../lib/utils'
import type { MerchantAppRelease } from '../types/api'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MerchantAppReleasePage() {
  const qc = useQueryClient()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [version, setVersion] = useState('')
  const [versionCode, setVersionCode] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [copied, setCopied] = useState(false)

  const latestQuery = useQuery({
    queryKey: ['admin', 'merchant-app-releases', 'latest'],
    queryFn: adminApi.getLatestMerchantAppRelease,
    retry: false,
  })

  const listQuery = useQuery({
    queryKey: ['admin', 'merchant-app-releases', 'list'],
    queryFn: () => adminApi.listMerchantAppReleases(1, 20),
  })

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Select an APK file')
      if (!version.trim()) throw new Error('Version is required')
      return adminApi.uploadMerchantAppRelease({
        file,
        version: version.trim(),
        versionCode: versionCode.trim() ? Number(versionCode) : undefined,
        notes: notes.trim() || undefined,
      })
    },
    onSuccess: (release) => {
      toast.success(`Merchant APK v${release.version} uploaded`)
      setVersion('')
      setVersionCode('')
      setNotes('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      qc.invalidateQueries({ queryKey: ['admin', 'merchant-app-releases'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Upload failed')),
  })

  const latest = latestQuery.data
  const releases = listQuery.data?.items ?? []

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Download link copied')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <div>
      <PageHeader
        title="Merchant app"
        description="Upload Android APK builds to the server (VPS disk) and share a download link with merchants. Cloudinary is not used here — free plans cap files at 10MB and APKs are larger."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-1 text-sm font-semibold text-(--text-primary)">Current release</h3>
          <p className="mb-4 text-xs text-(--text-muted)">
            Merchants install from this link on Android (allow install from unknown sources).
          </p>

          {latestQuery.isLoading && <Spinner />}
          {!latestQuery.isLoading && !latest && (
            <p className="text-sm text-(--text-muted)">No APK uploaded yet. Upload the first build below.</p>
          )}
          {latest && (
            <div className="space-y-3">
              <Row label="Version" value={latest.version} />
              {latest.versionCode != null && (
                <Row label="Version code" value={String(latest.versionCode)} />
              )}
              <Row label="File" value={latest.fileName} />
              <Row label="Size" value={formatBytes(latest.fileSize)} />
              <Row label="Uploaded" value={formatDateTime(latest.createdAt)} />
              {latest.notes && <Row label="Notes" value={latest.notes} />}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => window.open(latest.apkUrl, '_blank', 'noopener,noreferrer')}
                >
                  Download APK
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void copyLink(latest.apkUrl)}>
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              </div>
              <p className="break-all text-xs text-(--text-muted)">{latest.apkUrl}</p>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-(--text-primary)">Upload new APK</h3>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              uploadMutation.mutate()
            }}
          >
            <FormField label="Version *">
              <Input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 1.0.0"
                required
              />
            </FormField>
            <FormField label="Version code (optional)">
              <Input
                type="number"
                min={1}
                value={versionCode}
                onChange={(e) => setVersionCode(e.target.value)}
                placeholder="e.g. 1"
              />
            </FormField>
            <FormField label="APK file *">
              <input
                ref={fileRef}
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                className="block w-full text-sm text-(--text-secondary) file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-500"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="mt-1 text-xs text-(--text-muted)">
                  {file.name} · {formatBytes(file.size)}
                </p>
              )}
            </FormField>
            <FormField label="Notes (optional)">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What's new in this build…"
                rows={3}
              />
            </FormField>
            <Button
              type="submit"
              disabled={uploadMutation.isPending || !file || !version.trim()}
            >
              {uploadMutation.isPending ? 'Uploading…' : 'Upload to server'}
            </Button>
          </form>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-(--text-primary)">Release history</h3>
        {listQuery.isLoading && <Spinner />}
        {!listQuery.isLoading && releases.length === 0 && (
          <p className="text-sm text-(--text-muted)">No releases yet.</p>
        )}
        <div className="space-y-2">
          {releases.map((release: MerchantAppRelease) => (
            <div
              key={release.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--border) px-3 py-3"
            >
              <div>
                <p className="text-sm font-medium text-(--text-primary)">
                  v{release.version}
                  {release.versionCode != null ? ` (${release.versionCode})` : ''}
                </p>
                <p className="text-xs text-(--text-muted)">
                  {release.fileName} · {formatBytes(release.fileSize)} ·{' '}
                  {formatDateTime(release.createdAt)}
                </p>
                {release.notes && (
                  <p className="mt-0.5 text-xs text-(--text-secondary)">{release.notes}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => window.open(release.apkUrl, '_blank', 'noopener,noreferrer')}
                >
                  Download
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void copyLink(release.apkUrl)}>
                  Copy link
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-(--border) py-1.5 last:border-0">
      <span className="text-sm text-(--text-muted)">{label}</span>
      <span className="break-all text-right text-sm font-medium text-(--text-primary)">{value}</span>
    </div>
  )
}
