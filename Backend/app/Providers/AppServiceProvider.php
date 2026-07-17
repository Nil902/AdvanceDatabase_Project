<?php

namespace App\Providers;

use App\Mail\GmailApiTransport;
use App\Models\SystemUser;
use App\Models\UserAuthToken;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Custom "gmail_api" mail transport — sends over HTTPS via the Gmail
        // REST API (DigitalOcean blocks SMTP ports on droplets).
        Mail::extend('gmail_api', function (array $config) {
            return new GmailApiTransport(
                (string) ($config['client_id'] ?? ''),
                (string) ($config['client_secret'] ?? ''),
                (string) ($config['refresh_token'] ?? ''),
            );
        });

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
