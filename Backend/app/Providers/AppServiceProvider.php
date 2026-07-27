<?php

namespace App\Providers;

use App\Models\BirthCertificate;
use App\Models\Citizen;
use App\Models\DivorceCertificate;
use App\Models\FamilyUnit;
use App\Models\Household;
use App\Models\HouseholdMember;
use App\Models\IdentityCard;
use App\Models\MarriageCertificate;
use App\Models\SystemUser;
use App\Models\UserAuthToken;
use App\Observers\AuditObserver;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Audit trail: every create/update/delete on these registry models writes
        // an append-only, hash-chained row to user_action_logs (AuditObserver).
        foreach ([
            Citizen::class,
            BirthCertificate::class,
            IdentityCard::class,
            Household::class,
            HouseholdMember::class,
            MarriageCertificate::class,
            DivorceCertificate::class,
            FamilyUnit::class,
            SystemUser::class,
        ] as $model) {
            $model::observe(AuditObserver::class);
        }

        Auth::viaRequest('api_token', function ($request) {
            $plainToken = $request->bearerToken();

            if (! $plainToken) {
                return null;
            }

            $token = UserAuthToken::where('token_hash', hash('sha256', $plainToken))->first();

            if (! $token || ! $token->isValid()) {
                return null;
            }

            $user = SystemUser::whereNull('deleted_at')->find($token->user_id);

            if (! $user || ! $user->is_active || $user->isLocked()) {
                return null;
            }

            // Attach the token model to the user instance for this request only,
            // so controllers/middleware can check abilities / revoke it on logout
            // without an extra DB query.
            $user->currentToken = $token;

            $token->update(['last_used_at' => now()]);

            return $user;
        });
    }
}
