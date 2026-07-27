<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tamper-evidence: each row chains to the previous one's hash.
        Schema::table('user_action_logs', function (Blueprint $table) {
            $table->string('prev_hash', 64)->nullable()->after('performed_at');
            $table->string('hash', 64)->nullable()->after('prev_hash');
        });

        // Trigger-based append-only enforcement is Postgres-specific.
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION user_action_logs_no_mutate() RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'user_action_logs is append-only; % is not permitted', TG_OP;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_user_action_logs_no_update ON user_action_logs;
            CREATE TRIGGER trg_user_action_logs_no_update
                BEFORE UPDATE OR DELETE ON user_action_logs
                FOR EACH ROW EXECUTE FUNCTION user_action_logs_no_mutate();

            DROP TRIGGER IF EXISTS trg_user_action_logs_no_truncate ON user_action_logs;
            CREATE TRIGGER trg_user_action_logs_no_truncate
                BEFORE TRUNCATE ON user_action_logs
                FOR EACH STATEMENT EXECUTE FUNCTION user_action_logs_no_mutate();
        SQL);

        // Defense-in-depth: strip mutation rights from the app role if it exists
        // (the civil_app role is introduced in the Phase 1 cutover; guard for it).
        DB::unprepared(<<<'SQL'
            DO $$
            BEGIN
                IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'civil_app') THEN
                    REVOKE UPDATE, DELETE, TRUNCATE ON user_action_logs FROM civil_app;
                END IF;
            END $$;
        SQL);
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared('DROP TRIGGER IF EXISTS trg_user_action_logs_no_update ON user_action_logs;');
            DB::unprepared('DROP TRIGGER IF EXISTS trg_user_action_logs_no_truncate ON user_action_logs;');
            DB::unprepared('DROP FUNCTION IF EXISTS user_action_logs_no_mutate();');
        }

        Schema::table('user_action_logs', function (Blueprint $table) {
            $table->dropColumn(['prev_hash', 'hash']);
        });
    }
};
