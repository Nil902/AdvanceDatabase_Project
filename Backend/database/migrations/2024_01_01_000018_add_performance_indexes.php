<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // --- user_auth_tokens ---
        // Auth guard: WHERE token_hash = ? (already unique)
        // Password reset: WHERE user_id = ? AND revoked_at IS NULL
        Schema::table('user_auth_tokens', function (Blueprint $table) {
            $table->index(['user_id', 'revoked_at']);
        });

        // --- citizens ---
        // Demographics report: GROUP BY gender; JOIN on birth_place_village_id
        // Spatie filter: WHERE citizen_id = ? (already PK)
        Schema::table('citizens', function (Blueprint $table) {
            $table->index('birth_place_village_id');
            $table->index('gender');
            $table->index('date_of_birth');
        });

        // --- birth_certificates ---
        // Spatie filters: WHERE citizen_id = ?; WHERE status = ?
        // Sort: ORDER BY issue_date, registered_date
        Schema::table('birth_certificates', function (Blueprint $table) {
            $table->index('citizen_id');
            $table->index('status');
            $table->index('issue_date');
        });

        // --- identity_cards ---
        // Spatie filters: WHERE citizen_id = ?; WHERE status = ?; WHERE card_type = ?
        // Sort: ORDER BY issue_date, expiry_date
        // Public verify: WHERE card_serial_number = ? (already unique)
        Schema::table('identity_cards', function (Blueprint $table) {
            $table->index('citizen_id');
            $table->index('status');
            $table->index('issue_date');
            $table->index('expiry_date');
        });

        // --- card_status_logs ---
        // Lookup by card: WHERE card_id = ?
        Schema::table('card_status_logs', function (Blueprint $table) {
            $table->index('card_id');
        });

        // --- card_requests ---
        // Lookup by citizen: WHERE citizen_id = ?
        Schema::table('card_requests', function (Blueprint $table) {
            $table->index('citizen_id');
        });

        // --- dispatch_tracking ---
        // Lookup by card: WHERE card_id = ?
        Schema::table('dispatch_tracking', function (Blueprint $table) {
            $table->index('card_id');
        });

        // --- households ---
        // Report: WHERE is_active = true
        // Lookup by head: WHERE household_head_id = ?
        Schema::table('households', function (Blueprint $table) {
            $table->index('is_active');
            $table->index('household_head_id');
            $table->index('village_id');
        });

        // --- household_members ---
        // Frequent: WHERE household_id = ? AND citizen_id = ?
        // Transfer: WHERE citizen_id = ? AND left_date IS NULL
        Schema::table('household_members', function (Blueprint $table) {
            $table->index(['household_id', 'citizen_id']);
            $table->index(['citizen_id', 'left_date']);
        });

        // --- move_history ---
        // History: WHERE from_household_id = ? OR to_household_id = ? ORDER BY move_date DESC
        Schema::table('move_history', function (Blueprint $table) {
            $table->index(['from_household_id', 'move_date']);
            $table->index(['to_household_id', 'move_date']);
            $table->index('resident_id');
        });

        // --- family_units ---
        // Spatie filter: WHERE head_citizen_id = ?
        Schema::table('family_units', function (Blueprint $table) {
            $table->index('head_citizen_id');
        });

        // --- citizen_relationships ---
        // Family tree CTE: WHERE citizen_id_a = ?
        // Lookup: WHERE citizen_id_b = ?
        Schema::table('citizen_relationships', function (Blueprint $table) {
            $table->index('citizen_id_a');
            $table->index('citizen_id_b');
            $table->index('rel_type_id');
        });

        // --- marriage_certificates ---
        // Report: WHERE status = 'active'
        // Divorce lookup: WHERE certificate_id = ? AND status = 'active'
        Schema::table('marriage_certificates', function (Blueprint $table) {
            $table->index('status');
            $table->index('spouse_a_id');
            $table->index('spouse_b_id');
        });

        // --- divorce_certificates ---
        Schema::table('divorce_certificates', function (Blueprint $table) {
            $table->index('marriage_cert_id');
        });

        // --- citizen_marital_statuses ---
        Schema::table('citizen_marital_statuses', function (Blueprint $table) {
            $table->index('citizen_id');
        });

        // --- civil_status_histories ---
        Schema::table('civil_status_histories', function (Blueprint $table) {
            $table->index('citizen_id');
        });

        // --- nationality_histories ---
        Schema::table('nationality_histories', function (Blueprint $table) {
            $table->index('citizen_id');
        });

        // --- citizen_biometrics ---
        Schema::table('citizen_biometrics', function (Blueprint $table) {
            $table->index('citizen_id');
        });

        // --- citizen_addresses ---
        Schema::table('citizen_addresses', function (Blueprint $table) {
            $table->index(['citizen_id', 'is_current']);
        });

        // --- password_otps ---
        // Already has index on email from its migration

        // --- user_action_logs ---
        // Audit trail: WHERE user_id = ? ORDER BY performed_at DESC
        Schema::table('user_action_logs', function (Blueprint $table) {
            $table->index(['user_id', 'performed_at']);
            $table->index('target_table');
        });

        // --- legal_guardianships ---
        Schema::table('legal_guardianships', function (Blueprint $table) {
            $table->index('minor_id');
            $table->index('guardian_id');
        });

        // --- adoption_orders ---
        Schema::table('adoption_orders', function (Blueprint $table) {
            $table->index('child_id');
        });

        // --- foster_care_placements ---
        Schema::table('foster_care_placements', function (Blueprint $table) {
            $table->index('child_id');
            $table->index('foster_parent_id');
        });

        // --- villages -> communes -> districts -> provinces chain ---
        // JOIN chain in demographics report
        Schema::table('villages', function (Blueprint $table) {
            $table->index('commune_id');
        });

        Schema::table('communes', function (Blueprint $table) {
            $table->index('district_id');
        });

        Schema::table('districts', function (Blueprint $table) {
            $table->index('province_id');
        });

        // --- relationship_types ---
        // FamilyService: WHERE label = ?
        Schema::table('relationship_types', function (Blueprint $table) {
            $table->index('label');
        });
    }

    public function down(): void
    {
        Schema::table('user_auth_tokens', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'revoked_at']);
        });

        Schema::table('citizens', function (Blueprint $table) {
            $table->dropIndex(['birth_place_village_id']);
            $table->dropIndex(['gender']);
            $table->dropIndex(['date_of_birth']);
        });

        Schema::table('birth_certificates', function (Blueprint $table) {
            $table->dropIndex(['citizen_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['issue_date']);
        });

        Schema::table('identity_cards', function (Blueprint $table) {
            $table->dropIndex(['citizen_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['issue_date']);
            $table->dropIndex(['expiry_date']);
        });

        Schema::table('card_status_logs', function (Blueprint $table) {
            $table->dropIndex(['card_id']);
        });

        Schema::table('card_requests', function (Blueprint $table) {
            $table->dropIndex(['citizen_id']);
        });

        Schema::table('dispatch_tracking', function (Blueprint $table) {
            $table->dropIndex(['card_id']);
        });

        Schema::table('households', function (Blueprint $table) {
            $table->dropIndex(['is_active']);
            $table->dropIndex(['household_head_id']);
            $table->dropIndex(['village_id']);
        });

        Schema::table('household_members', function (Blueprint $table) {
            $table->dropIndex(['household_id', 'citizen_id']);
            $table->dropIndex(['citizen_id', 'left_date']);
        });

        Schema::table('move_history', function (Blueprint $table) {
            $table->dropIndex(['from_household_id', 'move_date']);
            $table->dropIndex(['to_household_id', 'move_date']);
            $table->dropIndex(['resident_id']);
        });

        Schema::table('family_units', function (Blueprint $table) {
            $table->dropIndex(['head_citizen_id']);
        });

        Schema::table('citizen_relationships', function (Blueprint $table) {
            $table->dropIndex(['citizen_id_a']);
            $table->dropIndex(['citizen_id_b']);
            $table->dropIndex(['rel_type_id']);
        });

        Schema::table('marriage_certificates', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['spouse_a_id']);
            $table->dropIndex(['spouse_b_id']);
        });

        Schema::table('divorce_certificates', function (Blueprint $table) {
            $table->dropIndex(['marriage_cert_id']);
        });

        Schema::table('citizen_marital_statuses', function (Blueprint $table) {
            $table->dropIndex(['citizen_id']);
        });

        Schema::table('civil_status_histories', function (Blueprint $table) {
            $table->dropIndex(['citizen_id']);
        });

        Schema::table('nationality_histories', function (Blueprint $table) {
            $table->dropIndex(['citizen_id']);
        });

        Schema::table('citizen_biometrics', function (Blueprint $table) {
            $table->dropIndex(['citizen_id']);
        });

        Schema::table('citizen_addresses', function (Blueprint $table) {
            $table->dropIndex(['citizen_id', 'is_current']);
        });

        Schema::table('user_action_logs', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'performed_at']);
            $table->dropIndex(['target_table']);
        });

        Schema::table('legal_guardianships', function (Blueprint $table) {
            $table->dropIndex(['minor_id']);
            $table->dropIndex(['guardian_id']);
        });

        Schema::table('adoption_orders', function (Blueprint $table) {
            $table->dropIndex(['child_id']);
        });

        Schema::table('foster_care_placements', function (Blueprint $table) {
            $table->dropIndex(['child_id']);
            $table->dropIndex(['foster_parent_id']);
        });

        Schema::table('villages', function (Blueprint $table) {
            $table->dropIndex(['commune_id']);
        });

        Schema::table('communes', function (Blueprint $table) {
            $table->dropIndex(['district_id']);
        });

        Schema::table('districts', function (Blueprint $table) {
            $table->dropIndex(['province_id']);
        });

        Schema::table('relationship_types', function (Blueprint $table) {
            $table->dropIndex(['label']);
        });
    }
};
