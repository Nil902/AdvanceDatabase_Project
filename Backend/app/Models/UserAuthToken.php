<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserAuthToken extends Model
{
    protected $primaryKey = 'token_id';
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id', 'token_hash', 'token_name', 'abilities',
        'last_used_at', 'expires_at', 'revoked_at',
    ];

    protected $casts = [
        'abilities' => 'array',
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(SystemUser::class, 'user_id', 'user_id');
    }

    /**
     * Issue a brand new token for a user. Returns the PLAIN TEXT token
     * (only available at creation time) plus the persisted model.
     *
     * The plain token is what goes to the client as the Bearer token.
     * Only its SHA-256 hash is ever stored in the database — this mirrors
     * how Sanctum handles its own tokens, adapted to this schema's columns.
     */
    public static function issue(SystemUser $user, string $name, array $abilities = ['*'], ?int $expiresInMinutes = null): array
    {
        $plainToken = Str::random(64);

        $token = static::create([
            'user_id'    => $user->user_id,
            'token_hash' => hash('sha256', $plainToken),
            'token_name' => $name,
            'abilities'  => $abilities,
            'expires_at' => $expiresInMinutes ? now()->addMinutes($expiresInMinutes) : null,
        ]);

        return [
            'token' => $plainToken, // e.g. "web-session|<64-char-random-string>" style is optional; kept plain here
            'model' => $token,
        ];
    }

    public function isValid(): bool
    {
        if ($this->revoked_at !== null) {
            return false;
        }

        if ($this->expires_at !== null && $this->expires_at->isPast()) {
            return false;
        }

        return true;
    }

    public function hasAbility(string $ability): bool
    {
        $abilities = $this->abilities ?? [];

        return in_array('*', $abilities, true) || in_array($ability, $abilities, true);
    }

    public function revoke(): void
    {
        $this->update(['revoked_at' => now()]);
    }
}
