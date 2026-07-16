<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Family\AddMemberRequest;
use App\Http\Requests\Family\StoreFamilyRequest;
use App\Http\Resources\FamilyResource;
use App\Models\FamilyUnit;
use App\Services\FamilyService;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class FamilyController extends Controller
{
    public function __construct(
        private FamilyService $familyService
    ) {}

    public function store(StoreFamilyRequest $request)
    {
        $family = $this->familyService->create($request->validated());

        return new FamilyResource($family);
    }

    public function search(Request $request)
    {
        $q = trim((string) $request->input('query', ''));

        $families = QueryBuilder::for(FamilyUnit::class)
            ->allowedFilters(
                AllowedFilter::exact('head_citizen_id'),
                'family_code',
            )
            ->when($q !== '', function ($builder) use ($q) {
                // Free-text search by family code or head citizen (name KH/EN or NID).
                $builder->where(function ($sub) use ($q) {
                    $sub->where('family_code', 'ILIKE', "%{$q}%")
                        ->orWhereHas('headCitizen', function ($c) use ($q) {
                            $c->where('full_name_en', 'ILIKE', "%{$q}%")
                                ->orWhere('full_name_kh', 'LIKE', "%{$q}%")
                                ->orWhere('national_id_number', 'ILIKE', "%{$q}%");
                        });
                });
            })
            ->with(['headCitizen'])
            ->paginate($request->input('per_page', 20));

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
        $this->familyService->addMember(
            $id,
            $request->relationship,
            $request->citizen_id,
            $request->verified ?? false
        );

        return response()->json(['message' => 'Member added to family unit'], 201);
    }

    public function tree(int $id)
    {
        $tree = $this->familyService->getTree($id);

        return response()->json($tree);
    }

    public function destroy(int $id)
    {
        $this->familyService->delete($id);

        return response()->json(['message' => 'Family unit deleted'], 200);
    }
}
