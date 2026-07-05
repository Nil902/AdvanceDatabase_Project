<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Auth\Authenticatable as AuthenticatableTrait;

class SystemUser extends Model implements Authenticatable
{
    use AuthenticatableTrait, SoftDeletes;

    protected $primaryKey = 'user_id';

    protected $fillable = [
        'username', 'email', 'password_hash', 'full_name_kh', 'full_name_en',
        'role_id', 'officer_id', 'commune_id', 'phone_number', 'avatar_url',
        'is_active', 'email_verified_at', 'last_login_at', 'last_login_ip',
        'password_changed_at', 'must_change_password', 'failed_login_attempts',
        'locked_until', 'created_by',
    ];

    protected $hidden = ['password_hash'];

    protected $casts = [
        'is_active' => 'boolean',
        'must_change_password' => 'boolean',
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'password_changed_at' => 'datetime',
        'locked_until' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // Laravel's default auth password column is "password"; this schema uses "password_hash"
    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    // ── Runtime-only property, not persisted — set by the auth guard so
    // controllers/middleware can inspect the token that authenticated this
    // request without an extra query. See AppServiceProvider::boot().
    public ?UserAuthToken $currentToken = null;

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    public function registerFailedLogin(): void
    {
        $this->increment('failed_login_attempts');

        if ($this->failed_login_attempts >= 5) {
            $this->update(['locked_until' => now()->addMinutes(15)]);
        }
    }

    public function registerSuccessfulLogin(string $ip): void
    {
        $this->update([
            'failed_login_attempts' => 0,
            'locked_until' => null,
            'last_login_at' => now(),
            'last_login_ip' => $ip,
        ]);
    }

    public function issueToken(string $name, array $abilities = ['*'], ?int $expiresInMinutes = null): array
    {
        return UserAuthToken::issue($this, $name, $abilities, $expiresInMinutes);
    }

    public function role()
    {
        return $this->belongsTo(UserRole::class, 'role_id', 'role_id');
    }

    public function officer()
    {
        return $this->belongsTo(RegistrationOfficer::class, 'officer_id', 'officer_id');
    }

    public function commune()
    {
        return $this->belongsTo(Commune::class, 'commune_id', 'commune_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(SystemUser::class, 'created_by', 'user_id');
    }

    public function adminProfile()
    {
        return $this->hasOne(AdminProfile::class, 'user_id', 'user_id');
    }

    public function authTokens()
    {
        return $this->hasMany(UserAuthToken::class, 'user_id', 'user_id');
    }

    public function actionLogs()
    {
        return $this->hasMany(UserActionLog::class, 'user_id', 'user_id');
    }
}
