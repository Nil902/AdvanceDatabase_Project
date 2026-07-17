<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SystemUserResource;
use App\Models\SystemUser;
use App\Models\UserRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * Admin-only management of system_users (the User Management dashboard tab).
 * Guarded by the admin:read ability in routes/api.php.
 */
class SystemUserController extends Controller
{
    // GET /api/v1/admin/users
    public function index(Request $request): JsonResponse
    {
        $query = SystemUser::with('role')->orderByDesc('created_at');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('username', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('full_name_en', 'ilike', "%{$search}%")
                    ->orWhere('full_name_kh', 'ilike', "%{$search}%");
            });
        }

        return SystemUserResource::collection($query->paginate($request->integer('per_page', 25)))
            ->response();
    }

    // GET /api/v1/admin/roles — the role list that drives the role dropdown.
    public function roles(): JsonResponse
    {
        $roles = UserRole::orderBy('role_id')->get()->map(fn ($r) => [
            'role_id' => $r->role_id,
            'role_code' => $r->role_code,
            'role_name' => $r->role_name_en ?? $r->role_name_kh,
        ]);

        return response()->json(['data' => $roles]);
    }

    // POST /api/v1/admin/users
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => 'required|string|max:100|unique:system_users,username',
            'email' => 'nullable|email|max:255|unique:system_users,email',
            'password' => 'required|string|min:8',
            'full_name_en' => 'nullable|string|max:255',
            'full_name_kh' => 'nullable|string|max:255',
            'phone_number' => 'nullable|string|max:30',
            'role_id' => 'required|integer|exists:user_roles,role_id',
            'is_active' => 'boolean',
        ]);

        $user = SystemUser::create([
            'username' => $data['username'],
            'email' => $data['email'] ?? null,
            'password_hash' => Hash::make($data['password']),
            'full_name_en' => $data['full_name_en'] ?? null,
            'full_name_kh' => $data['full_name_kh'] ?? null,
            'phone_number' => $data['phone_number'] ?? null,
            'role_id' => $data['role_id'],
            'is_active' => $data['is_active'] ?? true,
            'created_by' => $request->user()->user_id,
        ]);

        return (new SystemUserResource($user->load('role')))->response()->setStatusCode(201);
    }

    // PUT /api/v1/admin/users/{id}
    public function update(Request $request, int $id): JsonResponse
    {
        $user = SystemUser::findOrFail($id);

        $data = $request->validate([
            'username' => ['sometimes', 'string', 'max:100', Rule::unique('system_users', 'username')->ignore($id, 'user_id')],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('system_users', 'email')->ignore($id, 'user_id')],
            'password' => 'nullable|string|min:8',
            'full_name_en' => 'nullable|string|max:255',
            'full_name_kh' => 'nullable|string|max:255',
            'phone_number' => 'nullable|string|max:30',
            'role_id' => 'sometimes|integer|exists:user_roles,role_id',
            'is_active' => 'boolean',
        ]);

        $user->fill(collect($data)->except('password')->all());

        if (! empty($data['password'])) {
            $user->password_hash = Hash::make($data['password']);
            $user->password_changed_at = now();
        }

        $user->save();

        return (new SystemUserResource($user->load('role')))->response();
    }

    // DELETE /api/v1/admin/users/{id} — soft delete; can't delete yourself.
    public function destroy(Request $request, int $id): JsonResponse
    {
        if ((int) $request->user()->user_id === $id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $user = SystemUser::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }
}
