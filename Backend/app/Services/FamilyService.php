<?php

namespace App\Services;

use App\Models\CitizenRelationship;
use App\Models\FamilyUnit;
use App\Models\RelationshipType;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class FamilyService
{
    public function create(array $data): FamilyUnit
    {
        $family = FamilyUnit::create([
            'family_code' => $data['family_code'] ?? $this->generateFamilyCode(),
            'head_citizen_id' => $data['head_citizen_id'],
        ]);

        if (isset($data['members'])) {
            foreach ($data['members'] as $member) {
                $relType = RelationshipType::where('label', $member['relationship'])->first();
                if ($relType) {
                    CitizenRelationship::create([
                        'citizen_id_a' => $family->head_citizen_id,
                        'citizen_id_b' => $member['citizen_id'],
                        'rel_type_id' => $relType->rel_type_id,
                        'verified' => $member['verified'] ?? false,
                    ]);
                }
            }
        }

        Cache::tags(['families'])->flush();

        return $family;
    }

    public function addMember(int $familyId, string $relationship, int $citizenId, bool $verified = false): void
    {
        $family = FamilyUnit::findOrFail($familyId);
        $relType = RelationshipType::where('label', $relationship)->firstOrFail();

        CitizenRelationship::create([
            'citizen_id_a' => $family->head_citizen_id,
            'citizen_id_b' => $citizenId,
            'rel_type_id' => $relType->rel_type_id,
            'verified' => $verified,
        ]);

        Cache::tags(['families'])->forget("family:{$familyId}:tree");
    }

    public function getTree(int $familyId): array
    {
        return Cache::tags(['families'])->remember(
            "family:{$familyId}:tree",
            now()->addMinutes(15),
            function () use ($familyId) {
                $family = FamilyUnit::findOrFail($familyId);
                $headId = $family->head_citizen_id;

                return DB::select('
                    WITH RECURSIVE family_tree AS (
                        SELECT c.citizen_id, c.full_name_kh, CAST(? AS BIGINT) as parent_id, 1 as depth
                        FROM citizens c
                        WHERE c.citizen_id = ?
                        UNION ALL
                        SELECT c.citizen_id, c.full_name_kh, cr.citizen_id_a as parent_id, ft.depth + 1
                        FROM citizen_relationships cr
                        JOIN citizens c ON c.citizen_id = cr.citizen_id_b
                        JOIN family_tree ft ON cr.citizen_id_a = ft.citizen_id
                    )
                    SELECT * FROM family_tree ORDER BY depth;
                ', [null, $headId]);
            }
        );
    }

    private function generateFamilyCode(): string
    {
        return 'FAM'.strtoupper(bin2hex(random_bytes(6)));
    }
}
