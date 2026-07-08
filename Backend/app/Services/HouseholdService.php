<?php

namespace App\Services;

use App\Models\Household;
use App\Models\HouseholdMember;
use App\Models\MoveHistory;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HouseholdService
{
    public function create(array $data): Household
    {
        $household = Household::create($data);

        if (isset($data['household_head_id'])) {
            HouseholdMember::create([
                'household_id' => $household->household_id,
                'citizen_id' => $data['household_head_id'],
                'relation_to_head' => 'head',
                'joined_date' => now(),
            ]);
        }

        Cache::tags(['households'])->flush();

        return $household;
    }

    public function getMembers(int $householdId)
    {
        return Cache::tags(['households'])->remember(
            "household:{$householdId}:members",
            now()->addMinutes(10),
            function () use ($householdId) {
                $household = Household::findOrFail($householdId);

                return $household->members()->with('citizen')->get();
            }
        );
    }

    public function addMember(int $householdId, array $data): HouseholdMember
    {
        $household = Household::findOrFail($householdId);

        $member = HouseholdMember::create([
            'household_id' => $household->household_id,
            'citizen_id' => $data['citizen_id'],
            'relation_to_head' => $data['relation_to_head'],
            'joined_date' => $data['joined_date'] ?? now(),
        ]);

        Cache::tags(['households'])->forget("household:{$householdId}:members");

        return $member;
    }

    public function removeMember(int $householdId, int $citizenId): void
    {
        $household = Household::findOrFail($householdId);
        $member = $household->members()->where('citizen_id', $citizenId)->firstOrFail();
        $member->update(['left_date' => now()]);

        Cache::tags(['households'])->forget("household:{$householdId}:members");
    }

    public function changeHead(int $householdId, int $newHeadCitizenId): Household
    {
        $household = Household::findOrFail($householdId);
        $oldHeadId = $household->household_head_id;

        $household->update(['household_head_id' => $newHeadCitizenId]);

        DB::transaction(function () use ($household, $oldHeadId, $newHeadCitizenId) {
            if ($oldHeadId) {
                HouseholdMember::where('household_id', $household->household_id)
                    ->where('citizen_id', $oldHeadId)
                    ->update(['relation_to_head' => 'former_head']);
            }

            HouseholdMember::where('household_id', $household->household_id)
                ->where('citizen_id', $newHeadCitizenId)
                ->update(['relation_to_head' => 'head']);
        });

        Cache::tags(['households'])->forget("household:{$householdId}:members");

        return $household->fresh();
    }

    public function transfer(int $citizenId, ?int $fromId, int $toId, ?string $reason, ?int $authorizedBy, int $recordedBy): void
    {
        if (! $fromId) {
            $currentMember = HouseholdMember::where('citizen_id', $citizenId)
                ->whereNull('left_date')
                ->firstOrFail();
            $fromId = $currentMember->household_id;
        }

        DB::transaction(function () use ($citizenId, $fromId, $toId, $reason, $authorizedBy, $recordedBy) {
            $oldMember = HouseholdMember::where('household_id', $fromId)
                ->where('citizen_id', $citizenId)
                ->firstOrFail();
            $oldMember->update(['left_date' => now()]);

            HouseholdMember::create([
                'household_id' => $toId,
                'citizen_id' => $citizenId,
                'relation_to_head' => 'other',
                'joined_date' => now(),
            ]);

            MoveHistory::create([
                'resident_id' => $citizenId,
                'from_household_id' => $fromId,
                'to_household_id' => $toId,
                'move_date' => now(),
                'reason' => $reason,
                'authorized_by' => $authorizedBy,
                'recorded_by_user' => $recordedBy,
            ]);
        });

        Cache::tags(['households'])->forget("household:{$fromId}:members");
        Cache::tags(['households'])->forget("household:{$toId}:members");
    }

    public function getHistory(int $householdId)
    {
        return Cache::tags(['households'])->remember(
            "household:{$householdId}:history",
            now()->addMinutes(10),
            function () use ($householdId) {
                Household::findOrFail($householdId);

                return MoveHistory::where('from_household_id', $householdId)
                    ->orWhere('to_household_id', $householdId)
                    ->with('resident')
                    ->orderByDesc('move_date')
                    ->get();
            }
        );
    }
}
