<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Family\AddMemberRequest;
use App\Http\Requests\Family\StoreFamilyRequest;
use App\Http\Resources\FamilyResource;
use App\Models\FamilyUnit;
use App\Models\CitizenRelationship;
use App\Models\RelationshipType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;

class FamilyController extends Controller
{
    public function store(StoreFamilyRequest $request)
    {
        $family = FamilyUnit::create([
            'family_code' => $request->family_code ?? $this->generateFamilyCode(),
            'head_citizen_id' => $request->head_citizen_id,
        ]);

        if ($request->has('members')) {
            foreach ($request->members as $member) {
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

        return new FamilyResource($family);
    }

    public function search(Request $request)
    {
        $families = QueryBuilder::for(FamilyUnit::class)
            ->allowedFilters([
                AllowedFilter::exact('head_citizen_id'),
                'family_code',
            ])
            ->with(['headCitizen'])
            ->paginate($request->get('per_page', 20));

        return FamilyResource::collection($families);
    }

    public function update(Request $request, int $id)
    {
        $family = FamilyUnit::findOrFail($id);
        $family->update($request->only(['family_code', 'head_citizen_id']));

        return new FamilyResource($family);
    }

    public function addMember(AddMemberRequest $request, int $id)
    {
        $family = FamilyUnit::findOrFail($id);

        $relType = RelationshipType::where('label', $request->relationship)->firstOrFail();

        CitizenRelationship::create([
            'citizen_id_a' => $family->head_citizen_id,
            'citizen_id_b' => $request->citizen_id,
            'rel_type_id' => $relType->rel_type_id,
            'verified' => $request->verified ?? false,
        ]);

        return response()->json(['message' => 'Member added to family unit'], 201);
    }

    public function tree(int $id)
    {
        $family = FamilyUnit::findOrFail($id);
        $headId = $family->head_citizen_id;

        $tree = DB::select("
            WITH RECURSIVE family_tree AS (
                SELECT citizen_id, full_name_kh, parent_id, 1 as depth
                FROM citizens
                WHERE citizen_id = ?
                UNION ALL
                SELECT c.citizen_id, c.full_name_kh, c.parent_id, ft.depth + 1
                FROM citizens c
                JOIN family_tree ft ON c.parent_id = ft.citizen_id
            )
            SELECT * FROM family_tree ORDER BY depth;
        ", [$headId]);

        return response()->json($tree);
    }

    private function generateFamilyCode(): string
    {
        return 'FAM' . strtoupper(bin2hex(random_bytes(6)));
    }
}
