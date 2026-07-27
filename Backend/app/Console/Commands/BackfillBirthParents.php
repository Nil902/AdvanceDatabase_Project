<?php

namespace App\Console\Commands;

use App\Models\BirthCertificate;
use App\Models\Citizen;
use App\Models\ParentRecord;
use Illuminate\Console\Command;

/**
 * Phase 4.2 backfill: turn the legacy birth_certificates.mother_citizen_id /
 * father_citizen_id links into canonical `parents` rows and populate
 * mother_parent_id / father_parent_id.
 *
 * Run as a controlled step (not at deploy) because it touches every existing
 * birth certificate:
 *     php artisan birth-certs:backfill-parents
 *
 * Idempotent and resumable — only fills links that are still null, and reuses one
 * parents row per source citizen.
 */
class BackfillBirthParents extends Command
{
    protected $signature = 'birth-certs:backfill-parents {--chunk=1000}';

    protected $description = 'Backfill canonical parents rows from legacy mother/father_citizen_id';

    /** @var array<int,int> citizen_id => parent_id cache for this run */
    private array $cache = [];

    public function handle(): int
    {
        $chunk = max(1, (int) $this->option('chunk'));
        $processed = 0;

        $query = BirthCertificate::query()
            ->where(fn ($q) => $q->whereNotNull('mother_citizen_id')->orWhereNotNull('father_citizen_id'))
            ->where(fn ($q) => $q->whereNull('mother_parent_id')->orWhereNull('father_parent_id'));

        $this->info('Backfilling parents for '.$query->clone()->count().' certificate(s)…');

        $query->orderBy('certificate_id')->chunkById($chunk, function ($certs) use (&$processed) {
            foreach ($certs as $cert) {
                if ($cert->mother_citizen_id && ! $cert->mother_parent_id) {
                    $cert->mother_parent_id = $this->parentForCitizen((int) $cert->mother_citizen_id);
                }
                if ($cert->father_citizen_id && ! $cert->father_parent_id) {
                    $cert->father_parent_id = $this->parentForCitizen((int) $cert->father_citizen_id);
                }
                $cert->saveQuietly(); // don't fire the audit observer for a bulk backfill
                $processed++;
            }
        }, 'certificate_id');

        $this->info("✅ Backfilled {$processed} certificate(s).");

        return self::SUCCESS;
    }

    private function parentForCitizen(int $citizenId): int
    {
        if (isset($this->cache[$citizenId])) {
            return $this->cache[$citizenId];
        }

        $citizen = Citizen::find($citizenId);

        $parent = ParentRecord::firstOrCreate(
            ['citizen_id' => $citizenId],
            [
                'national_id_number' => $citizen?->national_id_number,
                'full_name_kh' => $citizen?->full_name_kh ?? '',
                'full_name_en' => $citizen?->full_name_en,
                'gender' => $citizen?->gender ?? '',
                'nationality' => $citizen?->nationality,
                'date_of_birth' => $citizen?->date_of_birth,
                'occupation' => $citizen?->occupation,
                'created_at' => now(),
            ]
        );

        return $this->cache[$citizenId] = $parent->parent_id;
    }
}
