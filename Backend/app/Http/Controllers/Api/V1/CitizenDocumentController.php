<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Citizen\DocumentUploadRequest;
use App\Models\DocumentAttachmentImage;
use App\Models\FamilyDocumentAttachment;
use App\Services\CitizenDocumentService;
use App\Services\CitizenService;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CitizenDocumentController extends Controller
{
    public function __construct(
        private CitizenService $citizenService
    ) {}

    // GET /citizens/{id}/documents — list the official documents on file for a
    // citizen (metadata only; bytes are streamed via show()).
    public function index(int $id)
    {
        $this->citizenService->findById($id); // 404s if the citizen doesn't exist

        $documents = FamilyDocumentAttachment::query()
            ->where('reference_table', 'citizens')
            ->where('reference_id', $id)
            ->with(['images:image_id,attachment_id,mime_type,file_name,file_size_bytes'])
            ->orderByDesc('uploaded_at')
            ->get()
            ->map(fn (FamilyDocumentAttachment $a) => [
                'attachment_id' => $a->attachment_id,
                'document_type' => $a->document_type,
                'uploaded_at' => $a->uploaded_at,
                'file_name' => $a->images->first()?->file_name,
                'mime_type' => $a->images->first()?->mime_type,
                'file_size_bytes' => $a->images->first()?->file_size_bytes,
                'image_id' => $a->images->first()?->image_id,
            ]);

        return response()->json(['data' => $documents]);
    }

    // POST /citizens/{id}/documents — upload one official document. Bytes land in
    // PostgreSQL (document_attachment_images), metadata in MongoDB.
    public function store(DocumentUploadRequest $request, CitizenDocumentService $documents, int $id)
    {
        $this->citizenService->findById($id);

        $attachment = $documents->store(
            $id,
            $request->file('document'),
            $request->validated('document_type'),
            (int) $request->user()->user_id,
        );

        $image = $attachment->images->first();

        return response()->json([
            'message' => 'Document uploaded successfully',
            'data' => [
                'attachment_id' => $attachment->attachment_id,
                'document_type' => $attachment->document_type,
                'uploaded_at' => $attachment->uploaded_at,
                'file_name' => $image?->file_name,
                'mime_type' => $image?->mime_type,
                'file_size_bytes' => $image?->file_size_bytes,
                'image_id' => $image?->image_id,
            ],
        ], 201);
    }

    // GET /citizens/{id}/documents/{imageId} — stream the stored bytes back
    // (auth-guarded; official documents are PII, never a public URL).
    public function show(int $id, int $imageId): StreamedResponse
    {
        $this->citizenService->findById($id);

        // Metadata + jurisdiction scoping (confirms the image belongs to THIS
        // citizen; 404 otherwise — no cross-citizen document access).
        $image = DocumentAttachmentImage::query()
            ->select('image_id', 'mime_type', 'file_name')
            ->whereKey($imageId)
            ->whereHas('attachment', function ($q) use ($id) {
                $q->where('reference_table', 'citizens')->where('reference_id', $id);
            })
            ->firstOrFail();

        // Pull the bytea back as base64 so retrieval is driver-independent (raw
        // bytea comes back either escaped or as a stream depending on the PDO
        // build); base64 sidesteps both.
        // NB: use ->first(), not ->value('b64') — value() re-selects the column
        // by name and discards the selectRaw, asking PG for a non-existent "b64"
        // column (500). base64_decode ignores the newlines PG's encode() inserts.
        $row = DB::table('document_attachment_images')
            ->where('image_id', $imageId)
            ->selectRaw("encode(image_data, 'base64') as b64")
            ->first();
        $bytes = base64_decode((string) ($row->b64 ?? ''));

        return response()->streamDownload(
            fn () => print($bytes),
            $image->file_name,
            [
                'Content-Type' => $image->mime_type,
                'Content-Length' => (string) strlen((string) $bytes),
                'Content-Disposition' => 'inline; filename="'.addslashes($image->file_name).'"',
            ],
        );
    }

    // DELETE /citizens/{id}/documents/{attachmentId} — remove a document from all
    // three stores (PG record + bytes, Mongo metadata).
    public function destroy(CitizenDocumentService $documents, int $id, int $attachmentId)
    {
        $this->citizenService->findById($id);

        abort_unless($documents->delete($id, $attachmentId), 404, 'Document not found.');

        return response()->json(['message' => 'Document deleted'], 200);
    }
}
