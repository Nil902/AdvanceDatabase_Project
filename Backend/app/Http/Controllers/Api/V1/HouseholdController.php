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
use App\Models\HouseholdMember;
use App\Models\MoveHistory;
use Illuminate\Support\Facades\DB;

class HouseholdController extends Controller
{
    public function store(StoreHouseholdRequest $request)
    {
        $household = Household::create($request->validated());

        if ($request->has('household_head_id')) {
            HouseholdMember::create([
                'household_id' => $household->household_id,
                'citizen_id' => $request->household_head_id,
                'relation_to_head' => 'head',
                'joined_date' => now(),
            ]);
        }

        return new HouseholdResource($household);
    }

    public function members(int $id)
    {
        $household = Household::findOrFail($id);
        $members = $household->members()->with('citizen')->get();

        return HouseholdMemberResource::collection($members);
    }

    public function addMember(AddMemberRequest $request, int $id)
    {
        $household = Household::findOrFail($id);

        $member = HouseholdMember::create([
            'household_id' => $household->household_id,
            'citizen_id' => $request->citizen_id,
            'relation_to_head' => $request->relation_to_head,
            'joined_date' => $request->joined_date ?? now(),
        ]);

        return new HouseholdMemberResource($member);
    }

    public function removeMember(int $id, int $citizenId)
    {
        $household = Household::findOrFail($id);
        $member = $household->members()->where('citizen_id', $citizenId)->firstOrFail();

        $member->update(['left_date' => now()]);

        return response()->json(['message' => 'Member removed from household'], 200);
    }

    public function changeHead(ChangeHeadRequest $request, int $id)
    {
        $household = Household::findOrFail($id);

        $oldHeadId = $household->household_head_id;
        $household->update(['household_head_id' => $request->new_head_citizen_id]);

        DB::transaction(function () use ($household, $oldHeadId, $request) {
            if ($oldHeadId) {
                HouseholdMember::where('household_id', $household->household_id)
                    ->where('citizen_id', $oldHeadId)
                    ->update(['relation_to_head' => 'former_head']);
            }

            HouseholdMember::where('household_id', $household->household_id)
                ->where('citizen_id', $request->new_head_citizen_id)
                ->update(['relation_to_head' => 'head']);
        });

        return new HouseholdResource($household->fresh());
    }

    public function updateAddress(UpdateAddressRequest $request, int $id)
    {
        $household = Household::findOrFail($id);
        $household->update($request->validated());

        return new HouseholdResource($household);
    }

    public function transfer(TransferRequest $request)
    {
        $citizenId = $request->citizen_id;
        $fromId = $request->from_household_id;
        $toId = $request->to_household_id;

        if (! $fromId) {
            $currentMember = HouseholdMember::where('citizen_id', $citizenId)
                ->whereNull('left_date')
                ->first();
            if (! $currentMember) {
                return response()->json(['message' => 'Citizen not currently in any household'], 422);
            }
            $fromId = $currentMember->household_id;
        }

        DB::transaction(function () use ($citizenId, $fromId, $toId, $request) {
            $oldMember = HouseholdMember::where('household_id', $fromId)
                ->where('citizen_id', $citizenId)
                ->firstOrFail();
            $oldMember->update(['left_date' => now()]);

            HouseholdMember::create([
                'household_id' => $toId,
                'citizen_id' => $citizenId,
                'relation_to_head' => $request->relation_to_head ?? 'other',
                'joined_date' => now(),
            ]);

            MoveHistory::create([
                'resident_id' => $citizenId,
                'from_household_id' => $fromId,
                'to_household_id' => $toId,
                'move_date' => now(),
                'reason' => $request->reason,
                'authorized_by' => $request->authorized_by ?? null,
                'recorded_by_user' => $request->user()->user_id,
            ]);
        });

        return response()->json(['message' => 'Transfer completed successfully'], 200);
    }

    public function history(int $id)
    {
        $household = Household::findOrFail($id);
        $history = MoveHistory::where('from_household_id', $id)
            ->orWhere('to_household_id', $id)
            ->with('resident')
            ->orderByDesc('move_date')
            ->get();

        return response()->json($history);
    }
}
