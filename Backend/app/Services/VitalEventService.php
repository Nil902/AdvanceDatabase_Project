<?php

namespace App\Services;

use App\Models\BirthCertificate;
use App\Models\CardStatusLog;
use App\Models\Citizen;
use App\Models\CitizenMaritalStatus;
use App\Models\CivilStatusHistory;
use App\Models\CivilStatusLookup;
use App\Models\DivorceCertificate;
use App\Models\Household;
use App\Models\HouseholdMember;
use App\Models\IdentityCard;
use App\Models\MarriageCertificate;
use App\Models\MarriageStatusHistory;
use App\Models\ParentRecord;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class VitalEventService
{
    public function recordMarriage(array $data, int $issuedBy): MarriageCertificate
    {
        $cert = DB::transaction(function () use ($data, $issuedBy) {
            // Defensive monogamy guard inside the transaction: the request-level
            // eligibility check can race with a concurrent registration.
            foreach ([$data['spouse_a_id'], $data['spouse_b_id']] as $spouseId) {
                $inMarriage = MarriageCertificate::where('status', 'active')
                    ->where(fn ($q) => $q->where('spouse_a_id', $spouseId)->orWhere('spouse_b_id', $spouseId))
                    ->lockForUpdate()->exists();
                if ($inMarriage) {
                    throw ValidationException::withMessages([
                        'spouse' => 'One of the spouses is already in an active marriage.',
                    ]);
                }
            }

            $cert = MarriageCertificate::create([
                'spouse_a_id' => $data['spouse_a_id'],
                'spouse_b_id' => $data['spouse_b_id'],
                'marriage_date' => $data['marriage_date'],
                'issued_by' => $issuedBy,
                'certificate_number' => $data['certificate_number'] ?? $this->generateCertNumber('M'),
                'location' => $data['location'] ?? null,
                'status' => 'active',
            ]);

            foreach ($data['witnesses'] ?? [] as $witness) {
                $cert->witnesses()->create([
                    'witness_name' => $witness['witness_name'],
                    'national_id' => $witness['national_id'] ?? null,
                    'phone_number' => $witness['phone_number'] ?? null,
                ]);
            }

            $this->logMarriageStatus($cert->certificate_id, 'active', $issuedBy, 'Marriage registered');
            $this->updateMaritalStatus($data['spouse_a_id'], 'married', $data['marriage_date'], $issuedBy);
            $this->updateMaritalStatus($data['spouse_b_id'], 'married', $data['marriage_date'], $issuedBy);

            return $cert;
        });

        Cache::tags(['vital_events'])->flush();

        return $cert;
    }

    public function recordDivorce(array $data, int $issuedBy): void
    {
        DB::transaction(function () use ($data, $issuedBy) {
            $marriage = MarriageCertificate::where('certificate_id', $data['marriage_cert_id'])
                ->where('status', 'active')
                ->firstOrFail();

            $marriage->update(['status' => 'divorced']);

            DivorceCertificate::create([
                'marriage_cert_id' => $marriage->certificate_id,
                'ruling_date' => $data['ruling_date'],
                'court_reference' => $data['court_reference'] ?? null,
                'issued_by' => $issuedBy,
            ]);

            $this->logMarriageStatus($marriage->certificate_id, 'divorced', $issuedBy, $data['court_reference'] ?? 'Divorce recorded');
            $this->updateMaritalStatus($marriage->spouse_a_id, 'divorced', $data['ruling_date'], $issuedBy);
            $this->updateMaritalStatus($marriage->spouse_b_id, 'divorced', $data['ruling_date'], $issuedBy);
        });

        Cache::tags(['vital_events'])->flush();
    }

    public function recordBirth(array $data): BirthCertificate
    {
        $cert = BirthCertificate::create([
            'citizen_id' => $data['citizen_id'],
            'mother_citizen_id' => $data['mother_citizen_id'] ?? null,
            'father_citizen_id' => $data['father_citizen_id'] ?? null,
            'certificate_number' => $data['certificate_number'] ?? $this->generateCertNumber('B'),
            'issue_date' => $data['issue_date'] ?? now(),
            'issued_by_officer_id' => $data['issued_by_officer_id'] ?? null,
            'registered_date' => now(),
            'status' => 'issued',
            'remarks' => $data['remarks'] ?? null,
        ]);

        Cache::tags(['birth_certificates'])->flush();

        return $cert;
    }

    /**
     * Record a death and cascade its downstream effects atomically: set the date
     * of death + civil status, revoke active ID cards, dissolve active marriages
     * (widowing the surviving spouse), reassign household headship, and surface
     * any minor children for guardianship review.
     *
     * @return array<string,mixed> a summary of what the cascade did
     */
    public function recordDeath(array $data, int $recordedBy): array
    {
        // NOTE: the request field is death_date (the old code read a non-existent
        // date_of_death key, so the entered date was silently ignored).
        $deathDate = $data['death_date'] ?? now();

        $summary = DB::transaction(function () use ($data, $recordedBy, $deathDate) {
            $citizen = Citizen::findOrFail($data['citizen_id']);
            $citizen->update(['date_of_death' => $deathDate]);

            $deceasedStatus = CivilStatusLookup::where('label', 'deceased')->firstOrFail();
            CivilStatusHistory::create([
                'citizen_id' => $citizen->citizen_id,
                'status_id' => $deceasedStatus->status_id,
                'effective_date' => $deathDate,
                'recorded_by' => $recordedBy,
            ]);

            // 1. Revoke the deceased's active/issued ID cards.
            $cards = IdentityCard::where('citizen_id', $citizen->citizen_id)
                ->whereIn('status', ['active', 'issued'])->get();
            foreach ($cards as $card) {
                $previous = $card->status;
                $card->update(['status' => 'revoked']);
                CardStatusLog::create([
                    'card_id' => $card->card_id,
                    'previous_status' => $previous,
                    'new_status' => 'revoked',
                    'reason' => 'Cardholder deceased',
                    'changed_by' => $recordedBy,
                    'changed_at' => now(),
                ]);
            }

            // 2. Dissolve active marriages; the surviving spouse becomes widowed.
            $marriages = MarriageCertificate::where('status', 'active')
                ->where(fn ($q) => $q->where('spouse_a_id', $citizen->citizen_id)->orWhere('spouse_b_id', $citizen->citizen_id))
                ->get();
            foreach ($marriages as $marriage) {
                $marriage->update(['status' => 'dissolved']);
                $this->logMarriageStatus($marriage->certificate_id, 'dissolved', $recordedBy, 'Dissolved by death of spouse');
                $survivorId = (int) $marriage->spouse_a_id === (int) $citizen->citizen_id ? $marriage->spouse_b_id : $marriage->spouse_a_id;
                $this->updateMaritalStatus($survivorId, 'widowed', $deathDate, $recordedBy);
            }

            // 3. Reassign headship of any household the deceased headed.
            $reassignments = [];
            foreach (Household::where('household_head_id', $citizen->citizen_id)->get() as $household) {
                $newHead = HouseholdMember::where('household_id', $household->household_id)
                    ->where('citizen_id', '!=', $citizen->citizen_id)
                    ->whereNull('left_date')->first();

                if ($newHead) {
                    $household->update(['household_head_id' => $newHead->citizen_id]);
                    HouseholdMember::where('household_id', $household->household_id)
                        ->where('citizen_id', $newHead->citizen_id)->update(['relation_to_head' => 'head']);
                }

                $reassignments[] = [
                    'household_id' => $household->household_id,
                    'new_head_id' => $newHead->citizen_id ?? null, // null → needs manual review
                ];
            }

            // 4. End the deceased's household membership(s).
            HouseholdMember::where('citizen_id', $citizen->citizen_id)
                ->whereNull('left_date')->update(['left_date' => $deathDate, 'relation_to_head' => 'deceased']);

            // 5. Flag minor children for guardianship review.
            $guardianshipReview = $this->minorChildrenOf($citizen, $deathDate);

            return [
                'revoked_cards' => $cards->count(),
                'dissolved_marriages' => $marriages->count(),
                'household_reassignments' => $reassignments,
                'guardianship_review' => $guardianshipReview,
            ];
        });

        Cache::tags(['citizens'])->flush();

        return $summary;
    }

    /**
     * Living children of the deceased who are minors as of the death date, via
     * both the legacy citizen links and the canonical parents rows (Phase 4.2).
     *
     * @return array<int,array<string,mixed>>
     */
    private function minorChildrenOf(Citizen $parent, $deathDate): array
    {
        $parentIds = ParentRecord::where('citizen_id', $parent->citizen_id)->pluck('parent_id');

        $childIds = BirthCertificate::query()
            ->where(function ($q) use ($parent, $parentIds) {
                $q->where('mother_citizen_id', $parent->citizen_id)
                    ->orWhere('father_citizen_id', $parent->citizen_id);
                if ($parentIds->isNotEmpty()) {
                    $q->orWhereIn('mother_parent_id', $parentIds)->orWhereIn('father_parent_id', $parentIds);
                }
            })
            ->pluck('citizen_id')->unique();

        if ($childIds->isEmpty()) {
            return [];
        }

        $minorCutoff = Carbon::parse($deathDate)->subYears(18)->toDateString();

        return Citizen::whereIn('citizen_id', $childIds)
            ->whereNull('date_of_death')
            ->whereDate('date_of_birth', '>', $minorCutoff)
            ->get(['citizen_id', 'full_name_kh', 'full_name_en', 'date_of_birth'])
            ->map(fn ($c) => [
                'citizen_id' => $c->citizen_id,
                'name' => $c->full_name_en ?: $c->full_name_kh,
                'date_of_birth' => $c->date_of_birth ? Carbon::parse($c->date_of_birth)->toDateString() : null,
            ])->all();
    }

    private function logMarriageStatus(int $marriageCertId, string $status, int $changedBy, ?string $reason = null): void
    {
        MarriageStatusHistory::create([
            'marriage_cert_id' => $marriageCertId,
            'status' => $status,
            'changed_at' => now(),
            'changed_by' => $changedBy,
            'reason' => $reason,
        ]);
    }

    private function updateMaritalStatus(int $citizenId, string $status, $effectiveDate, int $recordedBy): void
    {
        CitizenMaritalStatus::create([
            'citizen_id' => $citizenId,
            'status' => $status,
            'effective_date' => $effectiveDate,
            'recorded_by' => $recordedBy,
        ]);
    }

    private function generateCertNumber(string $prefix): string
    {
        return $prefix.date('Ymd').strtoupper(Str::random(6));
    }
}
