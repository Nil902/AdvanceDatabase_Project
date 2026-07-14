# Laravel API Guide — Civil Registry System (React + Laravel + PostgreSQL + Redis + MongoDB)

This guide maps your architecture diagram (Server 1 React → Server 3 Laravel → Server 2 Redis / Server 4 PostgreSQL / Server 5 MongoDB) into an actual buildable Laravel API, following your `Laravel_Endpoint_V2.txt` route list and your PostgreSQL V4 schema.

Everything below follows one repeating pattern. I fully build out **Birth Certificates** end-to-end as the template. Once you see it, ID Cards / Households / Family Management are the same shape with different tables.

---

## 1. How the pieces map to your diagram

| Diagram box | Laravel role |
|---|---|
| Server 1 (React) | Calls Laravel only through `/api/v1/...`, never touches Postgres/Mongo directly |
| Server 3 (Laravel) | Controllers + Services = "the core processing unit" |
| Server 4 (PostgreSQL) | Primary DB — Eloquent models, the source of truth (citizens, certificates, cards, households) |
| Server 5 (MongoDB) | Secondary DB — unstructured/flexible data only (biometrics, document metadata, print logs) via `jenssegers/mongodb` |
| Server 2 (Redis) | Cache-aside layer in front of Postgres reads, plus queues for `print` / `dispatch` jobs |

**Golden rule for this project:** every table with a `mongo_document_id` / `mongo_log_id` / `biometric_ref` column in your Postgres schema is a *pointer*. Laravel writes the structured half to Postgres and the flexible half to Mongo in the same request, using the UUID as the glue — never let React talk to Mongo directly.

---

## 2. Project setup

```bash
composer create-project laravel/laravel civil-registry-api
cd civil-registry-api

composer require laravel/sanctum        # token auth for /auth/login, /auth/me
composer require jenssegers/mongodb     # Mongo Eloquent models
composer require predis/predis          # Redis client (or use phpredis extension)
composer require spatie/laravel-query-builder  # clean filtering for GET /birth-certificates?filter[status]=issued
```

`.env`
```env
DB_CONNECTION=pgsql
DB_HOST=server-04-ip
DB_PORT=5432
DB_DATABASE=civil_registry
DB_USERNAME=postgres
DB_PASSWORD=secret

MONGO_HOST=server-05-ip
MONGO_PORT=27017
MONGO_DATABASE=civil_registry_docs

CACHE_STORE=redis
REDIS_HOST=server-02-ip
REDIS_PORT=6379
QUEUE_CONNECTION=redis
```

`config/database.php` — add the mongodb connection:
```php
'mongodb' => [
    'driver'   => 'mongodb',
    'host'     => env('MONGO_HOST', '127.0.0.1'),
    'port'     => env('MONGO_PORT', 27017),
    'database' => env('MONGO_DATABASE', 'civil_registry_docs'),
],
```

### Folder structure to use for every module
```
app/
  Models/
    Citizen.php
    BirthCertificate.php
    ...
  Models/Mongo/
    CitizenBiometric.php
    DocumentAttachment.php
  Http/
    Controllers/Api/V1/
      Auth/AuthController.php
      BirthCertificateController.php
      CitizenController.php
      IdCardController.php
      HouseholdController.php
      FamilyController.php
      VitalEventController.php
      ReportController.php
    Requests/BirthCertificate/
      StoreBirthCertificateRequest.php
      UpdateBirthCertificateRequest.php
    Resources/
      BirthCertificateResource.php
  Services/
    BirthCertificateService.php
    CacheService.php
  Policies/
    BirthCertificatePolicy.php
routes/
  api.php
```

---

## 3. Auth module — matches your `/api/v1/auth/*` block

Sanctum gives you token auth without the overhead of full OAuth, which is the right fit for a React SPA calling a Laravel API.

**Migration** — you already have `system_users` + `user_auth_tokens` in your schema. Sanctum's own `personal_access_tokens` table can *replace* `user_auth_tokens`, or you can keep `user_auth_tokens` as your own audit table and just use Sanctum's token issuance. I'd recommend keeping `user_auth_tokens` as-is (it already has `abilities`, `revoked_at`, `token_name`) and writing a thin wrapper.

```php
// app/Http/Controllers/Api/V1/Auth/AuthController.php
namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\SystemUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = SystemUser::where('username', $credentials['username'])
            ->whereNull('deleted_at')
            ->first();

        if (! $user || $user->locked_until?->isFuture()) {
            return response()->json(['message' => 'Account locked or not found'], 423);
        }

        if (! Hash::check($credentials['password'], $user->password_hash)) {
            $user->increment('failed_login_attempts');
            if ($user->failed_login_attempts >= 5) {
                $user->update(['locked_until' => now()->addMinutes(15)]);
            }
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $user->update([
            'failed_login_attempts' => 0,
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

        $token = $user->createToken('web-session', $this->abilitiesForRole($user->role_id));

        return response()->json([
            'user'  => $user->load('role'),
            'token' => $token->plainTextToken,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load('role'));
    }

    private function abilitiesForRole(int $roleId): array
    {
        // Pull from user_roles.role_code and map to ability strings,
        // matching the "abilities" json column on user_auth_tokens
        return match ($roleId) {
            1 => ['*'],                                   // admin
            2 => ['birth:*', 'id_card:*', 'household:*'],  // supervisor
            3 => ['birth:create', 'birth:read', 'id_card:read'], // registrar
            default => ['*:read'],                         // viewer
        };
    }
}
```

`routes/api.php`
```php
Route::prefix('v1/auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});
```

**RBAC middleware** — since your schema note says *"Permission logic is handled at the application layer via role_code only"*, write a simple ability-check middleware:

```php
// app/Http/Middleware/EnsureAbility.php
public function handle($request, Closure $next, string $ability)
{
    $token = $request->user()->currentAccessToken();
    if (! $token->can($ability) && ! $token->can('*')) {
        abort(403, "Missing ability: {$ability}");
    }
    return $next($request);
}
```
Register it as `'ability'` in `bootstrap/app.php`, then use it per route: `->middleware('ability:birth:create')`.

---

## 4. Full worked module — Birth Certificates

This is the template. Copy this shape for every other module.

### 4.1 Model
```php
// app/Models/BirthCertificate.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BirthCertificate extends Model
{
    protected $primaryKey = 'certificate_id';
    protected $fillable = [
        'citizen_id', 'mother_citizen_id', 'father_citizen_id',
        'certificate_number', 'issue_date', 'issued_by_officer_id',
        'registered_date', 'status', 'remarks',
    ];

    public function citizen()
    {
        return $this->belongsTo(Citizen::class, 'citizen_id', 'citizen_id');
    }

    public function mother()
    {
        return $this->belongsTo(Citizen::class, 'mother_citizen_id', 'citizen_id');
    }

    public function father()
    {
        return $this->belongsTo(Citizen::class, 'father_citizen_id', 'citizen_id');
    }

    public function officer()
    {
        return $this->belongsTo(RegistrationOfficer::class, 'issued_by_officer_id', 'officer_id');
    }

    public function images()
    {
        return $this->hasMany(BirthCertificateImage::class, 'certificate_id', 'certificate_id');
    }
}
```

### 4.2 Form Requests (validation lives here, not the controller)
```php
// app/Http/Requests/BirthCertificate/StoreBirthCertificateRequest.php
namespace App\Http\Requests\BirthCertificate;

use Illuminate\Foundation\Http\FormRequest;

class StoreBirthCertificateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentAccessToken()->can('birth:create');
    }

    public function rules(): array
    {
        return [
            'citizen_id'           => 'required|integer|exists:citizens,citizen_id|unique:birth_certificates,citizen_id',
            'mother_citizen_id'    => 'nullable|integer|exists:citizens,citizen_id',
            'father_citizen_id'    => 'nullable|integer|exists:citizens,citizen_id',
            'certificate_number'   => 'required|string|max:100|unique:birth_certificates,certificate_number',
            'issue_date'           => 'nullable|date',
            'issued_by_officer_id' => 'nullable|integer|exists:registration_officers,officer_id',
            'registered_date'      => 'nullable|date',
            'remarks'              => 'nullable|string',
        ];
    }
}
```

### 4.3 API Resource (shapes the JSON that React receives — never return raw models)
```php
// app/Http/Resources/BirthCertificateResource.php
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BirthCertificateResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                => $this->certificate_id,
            'certificate_number'=> $this->certificate_number,
            'status'            => $this->status,
            'issue_date'        => $this->issue_date,
            'registered_date'   => $this->registered_date,
            'citizen'           => new CitizenResource($this->whenLoaded('citizen')),
            'mother'            => new CitizenResource($this->whenLoaded('mother')),
            'father'            => new CitizenResource($this->whenLoaded('father')),
            'officer'           => new RegistrationOfficerResource($this->whenLoaded('officer')),
            'images'            => $this->whenLoaded('images', fn () =>
                $this->images->map(fn ($img) => ['id' => $img->image_id, 'mime_type' => $img->mime_type])
            ),
        ];
    }
}
```

### 4.4 Controller — with Redis cache-aside pattern
```php
// app/Http/Controllers/Api/V1/BirthCertificateController.php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\BirthCertificate\StoreBirthCertificateRequest;
use App\Http\Requests\BirthCertificate\UpdateBirthCertificateRequest;
use App\Http\Resources\BirthCertificateResource;
use App\Models\BirthCertificate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;

class BirthCertificateController extends Controller
{
    // GET /api/v1/birth-certificates
    public function index(Request $request)
    {
        $certs = QueryBuilder::for(BirthCertificate::class)
            ->allowedFilters(['status', AllowedFilter::exact('citizen_id')])
            ->allowedSorts(['issue_date', 'registered_date'])
            ->with(['citizen', 'officer'])
            ->paginate($request->get('per_page', 20));

        return BirthCertificateResource::collection($certs);
    }

    // POST /api/v1/birth-certificates
    public function store(StoreBirthCertificateRequest $request)
    {
        $cert = DB::transaction(function () use ($request) {
            $cert = BirthCertificate::create($request->validated() + ['status' => 'issued']);

            // Also assign national ID number to the citizen (per your endpoint list:
            // POST /citizens/{id}/assign-nid happens as its own call from React,
            // but you could trigger it here automatically if that's the workflow)

            return $cert;
        });

        // Bust the list cache since data changed
        Cache::tags(['birth_certificates'])->flush();

        return new BirthCertificateResource($cert->load(['citizen', 'mother', 'father']));
    }

    // GET /api/v1/birth-certificates/{id}
    public function show(int $id)
    {
        $cert = Cache::tags(['birth_certificates'])->remember(
            "birth_cert:{$id}",
            now()->addMinutes(10),
            fn () => BirthCertificate::with(['citizen', 'mother', 'father', 'officer', 'images'])
                ->findOrFail($id)
        );

        return new BirthCertificateResource($cert);
    }

    // PUT /api/v1/birth-certificates/{id}
    public function update(UpdateBirthCertificateRequest $request, int $id)
    {
        $cert = BirthCertificate::findOrFail($id);
        $cert->update($request->validated());

        Cache::tags(['birth_certificates'])->forget("birth_cert:{$id}");

        return new BirthCertificateResource($cert->fresh(['citizen', 'mother', 'father']));
    }

    // DELETE /api/v1/birth-certificates/{id}  — soft delete, matches your "Void/Soft-delete" note
    public function destroy(int $id)
    {
        $cert = BirthCertificate::findOrFail($id);
        $cert->update(['status' => 'cancelled']);

        Cache::tags(['birth_certificates'])->forget("birth_cert:{$id}");

        return response()->json(['message' => 'Certificate voided'], 200);
    }

    // POST /api/v1/birth-certificates/{id}/verify
    public function verify(int $id)
    {
        $cert = BirthCertificate::findOrFail($id);
        // signature/seal verification logic against officer_stamp_images
        return response()->json(['verified' => true, 'certificate_id' => $cert->certificate_id]);
    }

    // POST /api/v1/birth-certificates/{id}/print
    public function print(int $id)
    {
        $cert = BirthCertificate::findOrFail($id);

        // Dispatch to a queue (Redis-backed) rather than blocking the request
        \App\Jobs\EnqueueCertificatePrint::dispatch($cert->certificate_id, 'birth');

        return response()->json(['message' => 'Queued for printing'], 202);
    }
}
```

> **Why Cache::tags here matters for your architecture**: this *is* the "Server 3 ↔ Server 2 retrieve/store cache" arrow in your diagram. `show()` reads from Redis first and only hits Postgres on a cache miss; `store()`/`update()`/`destroy()` invalidate it. Note: the default Redis driver in Laravel supports tags; if you swap to `file`/`database` cache stores later, tags stop working, so keep `CACHE_STORE=redis`.

### 4.5 Routes for this module
```php
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::apiResource('birth-certificates', BirthCertificateController::class)
        ->parameters(['birth-certificates' => 'id']);

    Route::post('birth-certificates/{id}/verify', [BirthCertificateController::class, 'verify'])
        ->middleware('ability:birth:verify');
    Route::post('birth-certificates/{id}/print', [BirthCertificateController::class, 'print'])
        ->middleware('ability:birth:print');
});
```
`apiResource` auto-generates `index/store/show/update/destroy` for the 5 base routes in your endpoint list — you only hand-write the two custom actions (`verify`, `print`).

---

## 5. MongoDB integration — biometrics & document attachments

Your schema explicitly keeps flexible data in Mongo (`citizen_biometrics.mongo_document_id`, `family_document_attachments.mongo_document_id`). Model it with `jenssegers/mongodb`:

```php
// app/Models/Mongo/CitizenBiometricDocument.php
namespace App\Models\Mongo;

use Jenssegers\Mongodb\Eloquent\Model;

class CitizenBiometricDocument extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'citizen_biometrics';
    protected $guarded = [];
}
```

Controller action for `POST /api/v1/citizens/{id}/fingerprint`:
```php
public function uploadFingerprint(Request $request, int $citizenId)
{
    $validated = $request->validate([
        'template_data' => 'required', // base64 or structured payload
        'finger_positions' => 'required|array',
    ]);

    // 1. Write flexible data to Mongo
    $mongoDoc = CitizenBiometricDocument::create([
        'citizen_id' => $citizenId,
        'template_data' => $validated['template_data'],
        'finger_positions' => $validated['finger_positions'],
        'captured_at' => now(),
    ]);

    // 2. Write structured pointer + metadata to Postgres
    CitizenBiometric::create([
        'citizen_id' => $citizenId,
        'mongo_document_id' => (string) $mongoDoc->_id,
        'fingerprint_taken_date' => now(),
    ]);

    return response()->json(['message' => 'Fingerprint recorded'], 201);
}
```

This two-write pattern (Postgres row + Mongo doc, linked by UUID) is the one thing to reuse consistently across: biometrics, `document_attachment_images`/Mongo doc metadata, and print job logs (`mongo_log_id`).

---

## 6. Repeating the pattern for the rest of your endpoint list

| Module | Model(s) | Notes specific to that module |
|---|---|---|
| **ID Cards** | `IdentityCard`, `CardRequest`, `CardStatusLog`, `DispatchTracking` | `PATCH /id-cards/{id}/status` → write to `identity_cards.status` **and** insert a `card_status_logs` row in the same transaction. `POST /id-cards/{id}/dispatch` → create `dispatch_tracking` row + queue job, same as `print` above. `POST /id-cards/verify` (public) should be **unauthenticated** but rate-limited (`throttle:30,1`) since third parties call it. |
| **Households** | `Household`, `HouseholdMember`, `MoveHistory` | `POST /households/transfer` is the interesting one — it's a single endpoint that must, in one DB transaction: close the old `household_members` row (`left_date`), insert a new one, and write a `move_history` row. Wrap in `DB::transaction()`. |
| **Family Management** | `FamilyUnit`, `MarriageCertificate`, `DivorceCertificate`, `citizen_relationships` | `GET /families/{id}/tree` is a recursive relationship query — build it with a recursive CTE in raw SQL (`DB::select`) rather than nested Eloquent eager-loads, Postgres will do this far faster than N+1 relationship traversal in PHP. |
| **Vital Events** | Same models as above, plus `citizens.civil_status` updates | `POST /vital-events/marriage` writes to `marriage_certificates` *and* updates `citizen_marital_statuses` for both spouses — again, one transaction, both writes succeed or neither does. |
| **Reports** | Read-only, no dedicated table | `GET /reports/summary` and `/demographics` should **always** go through Redis with a longer TTL (e.g. 1 hour) since they're aggregate queries over the whole citizens table — don't recompute on every dashboard load. `GET /reports/export` streams a file; use Laravel's `response()->streamDownload()` and generate PDF/Excel in a queued job if the dataset is large. |

---

## 7. Consistent API response shape

Add this to `app/Exceptions/Handler.php` (or the `bootstrap/app.php` exception handling closure in Laravel 11) so React always gets a predictable error shape:

```php
->withExceptions(function ($exceptions) {
    $exceptions->render(function (\Throwable $e, $request) {
        if ($request->is('api/*')) {
            $status = match (true) {
                $e instanceof \Illuminate\Validation\ValidationException => 422,
                $e instanceof \Illuminate\Auth\AuthenticationException => 401,
                $e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException => 404,
                default => 500,
            };
            return response()->json([
                'message' => $e->getMessage(),
                'errors'  => $e instanceof \Illuminate\Validation\ValidationException ? $e->errors() : null,
            ], $status);
        }
    });
});
```

---

## 8. CORS for React (Server 1 ↔ Server 3)

`config/cors.php`:
```php
'paths' => ['api/*'],
'allowed_origins' => ['http://your-react-dev-url', 'https://your-production-domain'],
'supports_credentials' => true,
```
Since you're using Sanctum tokens (not cookie sessions), you don't strictly need `supports_credentials`, but set it if you ever switch to Sanctum's SPA cookie mode.

---

## 9. React side — minimal Axios client matching this API

```javascript
// api/client.js
import axios from 'axios';

const client = axios.create({
  baseURL: 'https://your-laravel-domain/api/v1',
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
```

```javascript
// api/birthCertificates.js
import client from './client';

export const listBirthCertificates = (params) =>
  client.get('/birth-certificates', { params }).then(r => r.data);

export const createBirthCertificate = (payload) =>
  client.post('/birth-certificates', payload).then(r => r.data);

export const printBirthCertificate = (id) =>
  client.post(`/birth-certificates/${id}/print`).then(r => r.data);
```

---

## 10. Build order I'd suggest for a 4-person group

1. **Auth + citizens + geography lookups** (provinces/districts/communes/villages) — everything else depends on these existing first.
2. **Birth Certificates** (fully worked above) — assign one person, it's the template the others copy.
3. **Households & Residency** — has the most transactional complexity (`transfer`), good for whoever's strongest on DB logic.
4. **ID Cards** — has the public `verify` endpoint, good candidate for whoever's handling rate-limiting/security.
5. **Family Management & Vital Events** — most relationally complex (family tree), do this last once the others' patterns are proven.
6. **Reports** — last, since it just reads what the other four already wrote.

This lets each teammate build a vertical slice (migration → model → request → resource → controller → routes) without blocking on each other, since they only share the `citizens` and `system_users` tables.
