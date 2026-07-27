<?php

namespace App\Services;

use App\Models\Citizen;
use App\Models\ParentRecord;

/**
 * Resolves a birth-certificate parent input to a canonical parents.parent_id.
 *
 * Input is either a link to a registered citizen (['citizen_id' => n]) or
 * manually-entered details (foreign / deceased / unregistered parents). Returns
 * null when there is effectively no parent to record.
 */
class ParentResolver
{
    /**
     * @param  array<string,mixed>|null  $input
     */
    public function resolve(?array $input): ?int
    {
        if (empty($input)) {
            return null;
        }

        // Registered citizen → reuse one parents row per citizen (snapshotting
        // their details so the certificate is self-contained).
        if (! empty($input['citizen_id'])) {
            $citizen = Citizen::findOrFail($input['citizen_id']);

            return ParentRecord::firstOrCreate(
                ['citizen_id' => $citizen->citizen_id],
                [
                    'national_id_number' => $citizen->national_id_number,
                    'full_name_kh' => $citizen->full_name_kh,
                    'full_name_en' => $citizen->full_name_en,
                    'gender' => $citizen->gender,
                    'nationality' => $citizen->nationality,
                    'date_of_birth' => $citizen->date_of_birth,
                    'occupation' => $citizen->occupation,
                    'created_at' => now(),
                ]
            )->parent_id;
        }

        // Nothing meaningful entered (e.g. an optional father left blank).
        if (empty($input['full_name_kh'])) {
            return null;
        }

        // Manually-entered parent.
        return ParentRecord::create([
            'national_id_number' => $input['national_id_number'] ?? null,
            'full_name_kh' => $input['full_name_kh'],
            'full_name_en' => $input['full_name_en'] ?? null,
            'gender' => $input['gender'],
            'nationality' => $input['nationality'] ?? null,
            'date_of_birth' => $input['date_of_birth'] ?? null,
            'occupation' => $input['occupation'] ?? null,
            'phone_number' => $input['phone_number'] ?? null,
            'created_at' => now(),
        ])->parent_id;
    }
}
