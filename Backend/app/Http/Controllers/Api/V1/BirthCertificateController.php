<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\BirthCertificate\StoreBirthCertificateRequest;
use App\Http\Requests\BirthCertificate\UpdateBirthCertificateRequest;
use App\Http\Resources\BirthCertificateResource;
use App\Jobs\EnqueueCertificatePrint;
use App\Jobs\LogReadEvent;
use App\Models\BirthCertificate;
use App\Services\JurisdictionScope;
use App\Services\PhotoStorageService;
use App\Services\ParentResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class BirthCertificateController extends Controller
{
    // Canonical parent records, plus the legacy citizen links as a fallback for
    // certificates not yet run through birth-certs:backfill-parents.
    private const PARENT_LOADS = [
        'citizen', 'officer.activeStamp', 'informant', 'verifiedBy',
        'motherParent.citizen', 'fatherParent.citizen', 'mother', 'father',
    ];

    public function index(Request $request, JurisdictionScope $jurisdiction)
    {
        // Phase 9: constrain to the officer's commune (no-op for admins /
        // unscoped accounts), via the child's birth_place_village_id.
        $base = $jurisdiction->byRelatedVillage(BirthCertificate::query(), $request->user(), 'citizen');

        $certs = QueryBuilder::for($base)
            ->allowedFilters('status', AllowedFilter::exact('citizen_id'))
            ->allowedSorts('issue_date', 'registered_date')
            // Newest first by default so a just-registered certificate lands on
            // page 1 (the frontend only loads page 1 for its list/search).
            ->defaultSort('-certificate_id')
            ->with(self::PARENT_LOADS)
            ->paginate($request->get('per_page', 20));

        return BirthCertificateResource::collection($certs);
    }

    public function store(StoreBirthCertificateRequest $request, ParentResolver $parents)
    {
        $data = $request->validated();

        $cert = DB::transaction(function () use ($data, $parents) {
            // All validated scalar fields flow straight through (incl. the 4.3
            // detail fields); the parent + informant objects are handled separately.
            $cert = BirthCertificate::create(
                collect($data)->except(['mother', 'father', 'informant'])->merge([
                    // Auto-allocate a unique registry number when none was supplied.
                    'certificate_number' => $data['certificate_number'] ?? $this->generateCertNumber(),
                    'registered_date' => $data['registered_date'] ?? now(),
                    'mother_parent_id' => $parents->resolve($data['mother'] ?? null),
                    'father_parent_id' => $parents->resolve($data['father'] ?? null),
                    'status' => 'issued',
                ])->all()
            );

            $cert->informant()->create($data['informant'] + ['created_at' => now()]);

            return $cert;
        });

        Cache::tags(['birth_certificates'])->flush();

        return new BirthCertificateResource($cert->load(self::PARENT_LOADS));
    }

    // Registry-controlled certificate number (BC + date + random), retried on
    // the rare unique collision — same pattern as ID-card serial allocation.
    private function generateCertNumber(): string
    {
        do {
            $number = 'BC'.date('Ymd').strtoupper(bin2hex(random_bytes(4)));
        } while (BirthCertificate::where('certificate_number', $number)->exists());

        return $number;
    }

    public function show(Request $request, int $id)
    {
        // NOTE: do not cache the Eloquent model — this cache store deserializes it
        // as __PHP_Incomplete_Class, which 500s BirthCertificateResource on a cache hit.
        $cert = BirthCertificate::with([...self::PARENT_LOADS, 'images'])
            ->findOrFail($id);

        LogReadEvent::record($request, 'birth_certificate', 'birth_certificates', $id);

        return new BirthCertificateResource($cert);
    }

    public function update(UpdateBirthCertificateRequest $request, int $id)
    {
        $cert = BirthCertificate::findOrFail($id);
        $data = $request->validated();
        $reason = $data['amendment_reason'] ?? null;
        unset($data['amendment_reason']);

        // Amending a record invalidates any prior verification — the corrected
        // certificate must be re-verified before it counts as confirmed again.
        if ($cert->verified_at !== null && ! empty($data)) {
            $data['verified_at'] = null;
            $data['verified_by'] = null;
            $data['last_amendment_reason'] = $reason;
        }

        $cert->update($data);

        Cache::tags(['birth_certificates'])->forget("birth_cert:{$id}");

        return new BirthCertificateResource($cert->fresh(self::PARENT_LOADS));
    }

    public function destroy(int $id)
    {
        $cert = BirthCertificate::findOrFail($id);
        $cert->update(['status' => 'cancelled']);

        Cache::tags(['birth_certificates'])->forget("birth_cert:{$id}");

        return response()->json(['message' => 'Certificate voided'], 200);
    }

    // POST /birth-certificates/{id}/verify — an authorized officer confirms the
    // record. Records who verified and when; a cancelled record can't be verified,
    // and verifying an already-verified record is a no-op (keeps the first stamp).
    public function verify(Request $request, int $id)
    {
        $cert = BirthCertificate::findOrFail($id);

        abort_if($cert->status === 'cancelled', 422, 'A cancelled certificate cannot be verified.');

        if ($cert->verified_at === null) {
            $cert->update([
                'verified_at' => now(),
                'verified_by' => $request->user()->user_id,
            ]);
            Cache::tags(['birth_certificates'])->forget("birth_cert:{$id}");
        }

        return new BirthCertificateResource($cert->fresh(self::PARENT_LOADS));
    }

    public function print(int $id)
    {
        $cert = BirthCertificate::findOrFail($id);
        // Dispatch print job (queue)
        EnqueueCertificatePrint::dispatch($cert->certificate_id, 'birth');

        return response()->json(['message' => 'Queued for printing'], 202);
    }

    // POST /birth-certificates/{id}/photo — attach/replace the certificate scan.
    // Bytes → photos disk (R2/local), pointer → PG, metadata → Mongo. Streamed
    // back via photo() below (never a public URL — the scan contains PII).
    public function uploadPhoto(Request $request, PhotoStorageService $photos, int $id)
    {
        $request->validate(['photo' => 'required|image|max:4096']);

        $cert = BirthCertificate::findOrFail($id);

        $ext = $request->file('photo')->extension() ?: 'jpg';
        $cert->photo_path = $photos->store(
            $request->file('photo'), "birth-certificates/{$id}", "scan.{$ext}",
            ['reference_table' => $cert->getTable(), 'reference_id' => $cert->getKey(),
                'document_type' => 'birth_certificate_scan', 'uploaded_by_user_id' => $request->user()?->user_id],
            replacing: $cert->photo_path,
        );
        $cert->save();

        Cache::tags(['birth_certificates'])->forget("birth_cert:{$id}");

        return new BirthCertificateResource($cert->fresh(self::PARENT_LOADS));
    }

    // GET /birth-certificates/{id}/photo — stream the stored scan (auth-guarded).
    public function photo(PhotoStorageService $photos, int $id)
    {
        $cert = BirthCertificate::findOrFail($id);

        abort_if(! $photos->exists($cert->photo_path), 404, 'No photo on file.');

        return $photos->response($cert->photo_path);
    }
}
