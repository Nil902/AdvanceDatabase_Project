<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Household\AddMemberRequest;
use App\Http\Requests\Household\ChangeHeadRequest;
use App\Http\Requests\Household\StoreHouseholdRequest;
use App\Http\Requests\Household\TransferRequest;
use App\Http\Requests\Household\UpdateAddressRequest;
use App\Http\Resources\HouseholdResource;
use App\Http\Resources\HouseholdMemberResource;
use App\Models\Household;
use App\Services\HouseholdService;
use Illuminate\Support\Facades\Cache;

class HouseholdController extends Controller
{
    public function __construct(
        private HouseholdService $householdService
    ) {}

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
