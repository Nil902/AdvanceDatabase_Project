<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\SystemUserResource;
use App\Services\PhotoStorageService;
use App\Models\SystemUser;
use App\Support\AuditChain;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    // POST /api/v1/auth/login
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $user = SystemUser::where(function ($query) use ($credentials) {
            $query->where('username', $credentials['username'])
                ->orWhere('email', $credentials['username']);
        })
            ->whereNull('deleted_at')
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password_hash)) {
            $user?->registerFailedLogin();

            return response()->json(['message' => 'Invalid username or password.'], 401);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'This account has been deactivated.'], 403);
        }

        if ($user->isLocked()) {
            return response()->json([
                'message' => 'Account temporarily locked due to failed login attempts. Try again later.',
                'locked_until' => $user->locked_until,
            ], 423);
        }

        $user->registerSuccessfulLogin($request->ip());

        // Auth events aren't model writes, so the AuditObserver never sees them.
        // Record the sign-in explicitly so the audit trail shows who logged in.
        AuditChain::append([
            'user_id' => $user->user_id,
            'action' => 'login',
            'target_table' => 'system_users',
            'target_id' => $user->user_id,
            'old_value' => null,
            'new_value' => null,
        ], $request->ip(), $request->userAgent());

        ['token' => $plainToken] = $user->issueToken(
            name: 'web-session',
            abilities: $this->abilitiesForRole($user->role_id),
            expiresInMinutes: 60 * 24 * 7,
        );

        return response()->json([
            'user' => new SystemUserResource($user->load('role', 'officer')),
            'token' => $plainToken,
            'token_type' => 'Bearer',
        ]);
    }

    // POST /api/v1/auth/logout
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->currentToken?->revoke();

        AuditChain::append([
            'user_id' => $user->user_id,
            'action' => 'logout',
            'target_table' => 'system_users',
            'target_id' => $user->user_id,
            'old_value' => null,
            'new_value' => null,
        ], $request->ip(), $request->userAgent());

        return response()->json(['message' => 'Logged out successfully.']);
    }

    // GET /api/v1/auth/me
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role', 'officer', 'commune');

        return response()->json(new SystemUserResource($user));
    }

    // PUT /api/v1/auth/me — self-service profile update. Any authenticated user
    // (admin or registrar) may edit their own name, contact details and password.
    // Role, status and account ownership are intentionally NOT editable here —
    // those stay admin-only via SystemUserController@update.
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'full_name_en' => 'sometimes|nullable|string|max:255',
            'full_name_kh' => 'sometimes|nullable|string|max:255',
            'email' => ['sometimes', 'nullable', 'email', 'max:255', Rule::unique('system_users', 'email')->ignore($user->user_id, 'user_id')],
            'phone_number' => 'sometimes|nullable|string|max:30',
            'password' => 'nullable|string|min:8',
        ]);

        $user->fill(collect($data)->except('password')->all());

        if (! empty($data['password'])) {
            $user->password_hash = Hash::make($data['password']);
            $user->password_changed_at = now();
        }

        $user->save();

        return response()->json(new SystemUserResource($user->load('role')));
    }

    // POST /api/v1/auth/me/avatar — the authenticated user sets their own profile
    // picture. Bytes → photos disk (Spaces/R2/local), pointer → PG, metadata →
    // Mongo. Streamed back via avatar() below.
    public function uploadAvatar(Request $request, PhotoStorageService $photos): JsonResponse
    {
        $request->validate(['photo' => 'required|image|max:4096']);

        $user = $request->user();

        $ext = $request->file('photo')->extension() ?: 'jpg';
        $user->avatar_path = $photos->store(
            $request->file('photo'), "avatars/{$user->user_id}", "avatar.{$ext}",
            ['reference_table' => $user->getTable(), 'reference_id' => $user->getKey(),
                'document_type' => 'user_avatar', 'uploaded_by_user_id' => $user->user_id],
            replacing: $user->avatar_path,
        );
        $user->save();

        return response()->json(new SystemUserResource($user->load('role')));
    }

    // GET /api/v1/auth/me/avatar — stream the authenticated user's avatar.
    public function avatar(Request $request, PhotoStorageService $photos)
    {
        $user = $request->user();

        abort_if(! $photos->exists($user->avatar_path), 404, 'No avatar on file.');

        return $photos->response($user->avatar_path);
    }

    private function abilitiesForRole(int $roleId): array
    {
        // Full set of registrar-portal abilities. Every route the portal calls
        // is covered here so both supervisors (2) and registrars (3) can operate
        // the portal without hitting a 403 (e.g. household:update for member
        // removal / address changes).
        // Must list EVERY granular ability the portal's routes/FormRequests check
        // (hasAbility is an exact match). A missing entry 403s an operator on a
        // function they're meant to perform — e.g. the assign_nid / upload_* /
        // renew / replace / vital:* endpoints all enforce their own ability.
        $portalAbilities = [
            'birth:create', 'birth:read', 'birth:update', 'birth:void', 'birth:verify', 'birth:print',
            'id_card:create', 'id_card:read', 'id_card:update', 'id_card:update_status',
            'id_card:dispatch', 'id_card:renew', 'id_card:replace',
            'household:create', 'household:read', 'household:update',
            'household:add_member', 'household:change_head', 'household:transfer', 'household:update_address',
            'family:create', 'family:read', 'family:update', 'family:add_member', 'family:delete',
            'citizen:create', 'citizen:read', 'citizen:update',
            'citizen:assign_nid', 'citizen:upload_fingerprint', 'citizen:upload_photo',
            'citizen:upload_document',
            'vital:birth', 'vital:death', 'vital:divorce', 'vital:marriage',
            'reports:read',
        ];

        return match ($roleId) {
            1 => ['*'],                 // admin — full system access
            2 => $portalAbilities,      // supervisor
            3 => $portalAbilities,      // registrar
            default => [                // viewer — read-only
                'birth:read', 'id_card:read', 'household:read', 'family:read', 'citizen:read', 'reports:read',
            ],
        };
    }
}
