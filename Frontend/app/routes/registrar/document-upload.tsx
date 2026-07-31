import { useCallback, useEffect, useState } from 'react';
import {
  FileUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Paperclip,
  Trash2,
} from 'lucide-react';
import { api, ApiError, fetchAuthedBlobUrl } from '~/lib/api';
import { CitizenSearch, type CitizenOption } from '~/components/CitizenSearch';

// Official document kinds a registrar commonly files. "other" lets them type a
// free-form label so any document can be stored without a code change (the API
// accepts any string for document_type).
const DOCUMENT_TYPES = [
  { value: 'national_id', label: 'National ID Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'marriage_certificate', label: 'Marriage Certificate' },
  { value: 'death_certificate', label: 'Death Certificate' },
  { value: 'family_book', label: 'Family / Residency Book' },
  { value: 'residency_proof', label: 'Proof of Residence' },
  { value: 'court_order', label: 'Court Order' },
  { value: 'other', label: 'Other (specify)' },
];

interface DocumentRow {
  attachment_id: number;
  document_type: string;
  uploaded_at: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  image_id: number | null;
}

function humanType(value: string): string {
  return DOCUMENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

function humanSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUpload() {
  const [citizen, setCitizen] = useState<CitizenOption | null>(null);
  const [documentType, setDocumentType] = useState('national_id');
  const [customType, setCustomType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadDocuments = useCallback(async (citizenId: number) => {
    setLoadingList(true);
    try {
      const res = await api.get<{ data: DocumentRow[] }>(`/citizens/${citizenId}/documents`);
      setDocuments(res.data);
    } catch {
      setDocuments([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Reload the document list whenever the selected citizen changes.
  useEffect(() => {
    if (citizen) {
      loadDocuments(citizen.id);
    } else {
      setDocuments([]);
    }
    setSuccess(null);
    setError(null);
  }, [citizen, loadDocuments]);

  const resolvedType = documentType === 'other' ? customType.trim() : documentType;
  const canSubmit = Boolean(citizen && file && resolvedType && !uploading);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!citizen || !file || !resolvedType) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    const form = new FormData();
    form.append('document', file);
    form.append('document_type', resolvedType);

    try {
      await api.post(`/citizens/${citizen.id}/documents`, form);
      setSuccess(`Uploaded “${file.name}” for ${citizen.full_name_en ?? citizen.full_name_kh ?? 'citizen'}.`);
      setFile(null);
      // Reset the native file input.
      const input = document.getElementById('document-file') as HTMLInputElement | null;
      if (input) input.value = '';
      await loadDocuments(citizen.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc: DocumentRow) {
    if (!citizen) return;
    if (!window.confirm(`Delete “${doc.file_name ?? humanType(doc.document_type)}”? This cannot be undone.`)) return;
    setDeletingId(doc.attachment_id);
    setError(null);
    setSuccess(null);
    try {
      await api.del(`/citizens/${citizen.id}/documents/${doc.attachment_id}`);
      setDocuments((prev) => prev.filter((d) => d.attachment_id !== doc.attachment_id));
      setSuccess('Document deleted.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the document.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(doc: DocumentRow) {
    if (!citizen || !doc.image_id) return;
    setDownloadingId(doc.image_id);
    try {
      const url = await fetchAuthedBlobUrl(`/citizens/${citizen.id}/documents/${doc.image_id}`);
      window.open(url, '_blank', 'noopener');
      // Give the new tab a moment to load before revoking the object URL.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError('Could not open the document.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <FileUp className="h-5 w-5 text-cyan-500" />
          Upload Official Document
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Attach any official document (PDF or scan) to a citizen&apos;s record. Files are
          stored in the registry database (PostgreSQL) with metadata indexed in MongoDB.
        </p>
      </div>

      {/* ── Upload form ─────────────────────────────────────────────── */}
      <form onSubmit={handleUpload} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Citizen</label>
          <CitizenSearch
            placeholder="Find the citizen by name (KH/ENG) or NID"
            selected={citizen}
            onSelect={setCitizen}
            ringClass="focus:ring-cyan-400"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Document type</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {documentType === 'other' && (
              <input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Describe the document"
                maxLength={100}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
              />
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">File (PDF or image, ≤ 8 MB)</label>
            <input
              id="document-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-700 hover:file:bg-cyan-100"
            />
            {file && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
                <Paperclip className="h-3 w-3" />
                {file.name} · {humanSize(file.size)}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            {uploading ? 'Uploading…' : 'Upload Document'}
          </button>
        </div>
      </form>

      {/* ── Documents on file ───────────────────────────────────────── */}
      {citizen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
            <FileText className="h-4 w-4 text-slate-400" />
            Documents on file
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              {documents.length}
            </span>
          </h3>

          {loadingList ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : documents.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No documents uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <li key={doc.attachment_id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{humanType(doc.document_type)}</p>
                      <p className="truncate text-[11px] text-slate-500">
                        {doc.file_name ?? '—'} · {humanSize(doc.file_size_bytes)}
                        {doc.uploaded_at ? ` · ${new Date(doc.uploaded_at).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      disabled={!doc.image_id || downloadingId === doc.image_id}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {downloadingId === doc.image_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc.attachment_id}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === doc.attachment_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
