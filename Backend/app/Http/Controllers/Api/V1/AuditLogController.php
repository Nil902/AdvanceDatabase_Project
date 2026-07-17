<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\UserActionLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin-only, read-only view of user_action_logs (the Audit Logs dashboard tab).
 * Guarded by the admin:read ability in routes/api.php.
 */
class AuditLogController extends Controller
{
    // GET /api/v1/admin/audit-logs
    public function index(Request $request): JsonResponse
    {
        $query = UserActionLog::with('user:user_id,username,email,full_name_en')
            ->orderByDesc('performed_at')
            ->orderByDesc('log_id');

        if ($action = $request->query('action')) {
            $query->where('action', 'ilike', "%{$action}%");
        }

        $logs = $query->paginate($request->integer('per_page', 50));

        $logs->getCollection()->transform(fn (UserActionLog $log) => [
            'id' => $log->log_id,
            'action' => $log->action,
            'target_table' => $log->target_table,
            'target_id' => $log->target_id,
            'actor' => $log->user?->full_name_en ?? $log->user?->username ?? $log->user?->email ?? 'System',
            'ip_address' => $log->ip_address,
            'user_agent' => $log->user_agent,
            'performed_at' => optional($log->performed_at)->toDateTimeString(),
        ]);

        return response()->json($logs);
    }
}
