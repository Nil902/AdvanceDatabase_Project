<?php

namespace App\Services;

use App\Models\BirthCertificate;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class BirthCertificateService
{
    public function create(array $data): BirthCertificate
    {
        $cert = DB::transaction(function () use ($data) {
            return BirthCertificate::create($data + ['status' => 'issued']);
        });

        Cache::tags(['birth_certificates'])->flush();

        return $cert;
    }

    public function findById(int $id): BirthCertificate
    {
        // NOTE: do not cache the Eloquent model — this cache store deserializes it
        // as __PHP_Incomplete_Class, which violates the : BirthCertificate return
        // type and 500s on a cache hit.
        return BirthCertificate::with(['citizen', 'mother', 'father', 'officer', 'images'])
            ->findOrFail($id);
    }

    public function update(int $id, array $data): BirthCertificate
    {
        $cert = BirthCertificate::findOrFail($id);
        $cert->update($data);

        Cache::tags(['birth_certificates'])->forget("birth_cert:{$id}");

        return $cert->fresh(['citizen', 'mother', 'father']);
    }

    public function void(int $id): void
    {
        $cert = BirthCertificate::findOrFail($id);
        $cert->update(['status' => 'cancelled']);

        Cache::tags(['birth_certificates'])->forget("birth_cert:{$id}");
    }
}
