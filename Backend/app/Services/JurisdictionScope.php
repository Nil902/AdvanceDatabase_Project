<?php

namespace App\Services;

use App\Models\SystemUser;
use App\Models\Village;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;

/**
 * Row-level jurisdictional scoping (Phase 9).
 *
 * SAFE OPT-IN model: scoping only constrains a query when the acting user is a
 * non-admin who has a commune assigned. Admins (wildcard-ability token) and any
 * account with a NULL commune_id keep full/national visibility, so existing
 * accounts are unaffected until a commune is explicitly assigned to them
 * (via PUT /api/v1/admin/users/{id} with commune_id).
 *
 * A record's jurisdiction is its village's commune. Households anchor on their
 * own village_id; citizens / birth certificates anchor on the citizen's
 * birth_place_village_id.
 */
class JurisdictionScope
{
    /**
     * Whether jurisdictional scoping should constrain queries for this user.
     */
    public function applies(?SystemUser $user): bool
    {
        if (! $user || $user->commune_id === null) {
            return false;
        }

        $token = $user->currentToken;

        // Admins (wildcard ability) are never scoped.
        return ! ($token && $token->hasAbility('*'));
    }

    /**
     * Village ids inside a commune. Geography is effectively static, so cache it.
     *
     * @return array<int,int>
     */
    public function villageIds(int $communeId): array
    {
        return Cache::remember(
            "jurisdiction:commune:{$communeId}:villages",
            now()->addHours(6),
            fn () => Village::where('commune_id', $communeId)->pluck('village_id')->all()
        );
    }

    /**
     * Constrain a query to the user's commune via a direct village-id column
     * (e.g. households.village_id, citizens.birth_place_village_id).
     */
    public function byVillageColumn(Builder $query, ?SystemUser $user, string $column): Builder
    {
        if (! $this->applies($user)) {
            return $query;
        }

        // A scoped user whose commune has no villages matches nothing — not
        // everything — so scoping can never silently widen access.
        $villageIds = $this->villageIds($user->commune_id) ?: [-1];

        return $query->whereIn($column, $villageIds);
    }

    /**
     * Constrain a query to the user's commune via a related model that carries
     * the village-id column (e.g. a birth certificate's citizen).
     */
    public function byRelatedVillage(Builder $query, ?SystemUser $user, string $relation, string $column = 'birth_place_village_id'): Builder
    {
        if (! $this->applies($user)) {
            return $query;
        }

        $villageIds = $this->villageIds($user->commune_id) ?: [-1];

        return $query->whereHas($relation, fn ($q) => $q->whereIn($column, $villageIds));
    }
}
