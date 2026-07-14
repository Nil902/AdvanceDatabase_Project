<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Household\AddMemberRequest;
use App\Http\Requests\Household\ChangeHeadRequest;
use App\Http\Requests\Household\StoreHouseholdRequest;
use App\Http\Requests\Household\TransferRequest;
use App\Http\Requests\Household\UpdateAddressRequest;
use App\Http\Resources\HouseholdMemberResource;
use App\Http\Resources\HouseholdResource;
use App\Models\Household;
use App\Services\HouseholdService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class HouseholdController extends Controller
{
    public function __construct(
        private HouseholdService $householdService
    ) {}

    // GET /households — paginated residency-book ledger with head + live member count.
    public function index(Request $request)
    {
        $households = QueryBuilder::for(Household::class)
            ->allowedFilters(
                AllowedFilter::exact('village_id'),
                AllowedFilter::exact('is_active'),
                'household_number',
            )
            ->allowedSorts('household_number', 'created_date')
            ->with(['headCitizen', 'village.commune.district.province'])
            ->withCount(['members' => fn ($q) => $q->whereNull('left_date')])
            ->paginate($request->get('per_page', 20));

        return HouseholdResource::collection($households);
    }

    public function store(StoreHouseholdRequest $request)
    {
        $household = $this->householdService->create($request->validated());

        return new HouseholdResource($household);
    }

    public function members(int $id)
    {
        $members = $this->householdService->getMembers($id);

        return HouseholdMemberResource::collection($members);
    }

    public function addMember(AddMemberRequest $request, int $id)
    {
        $member = $this->householdService->addMember($id, $request->validated());

        return new HouseholdMemberResource($member);
    }

    public function removeMember(int $id, int $citizenId)
    {
        $this->householdService->removeMember($id, $citizenId);

        return response()->json(['message' => 'Member removed from household'], 200);
    }

    public function changeHead(ChangeHeadRequest $request, int $id)
    {
        $household = $this->householdService->changeHead($id, $request->new_head_citizen_id);

        return new HouseholdResource($household);
    }

    public function updateAddress(UpdateAddressRequest $request, int $id)
    {
        $household = Household::findOrFail($id);
        $household->update($request->validated());

        Cache::tags(['households'])->forget("household:{$id}:members");

        return new HouseholdResource($household);
    }

    public function transfer(TransferRequest $request)
    {
        $this->householdService->transfer(
            $request->citizen_id,
            $request->from_household_id,
            $request->to_household_id,
            $request->reason,
            $request->authorized_by,
            $request->user()->user_id
        );

        return response()->json(['message' => 'Transfer completed successfully'], 200);
    }

    public function history(int $id)
    {
        $history = $this->householdService->getHistory($id);

        return response()->json($history);
    }
}
