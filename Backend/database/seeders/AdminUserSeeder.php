<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('user_roles')->insertOrIgnore([
            ['role_id' => 1, 'role_code' => 'admin', 'role_name_en' => 'Administrator', 'role_name_kh' => 'អ្នកគ្រប់គ្រង', 'description' => 'Full system access', 'created_at' => now()],
            ['role_id' => 2, 'role_code' => 'supervisor', 'role_name_en' => 'Supervisor', 'role_name_kh' => 'អ្នកត្រួតពិនិត្យ', 'description' => 'Supervisory access', 'created_at' => now()],
            ['role_id' => 3, 'role_code' => 'registrar', 'role_name_en' => 'Registrar', 'role_name_kh' => 'អ្នកចុះបញ្ជី', 'description' => 'Registration operations', 'created_at' => now()],
            ['role_id' => 4, 'role_code' => 'viewer', 'role_name_en' => 'Viewer', 'role_name_kh' => 'អ្នកមើល', 'description' => 'Read-only access', 'created_at' => now()],
        ]);

        DB::table('system_users')->updateOrInsert(
            ['username' => 'admin'],
            [
                'email' => 'sina015772825@gmail.com',
                'password_hash' => Hash::make('password123'),
                'full_name_en' => 'System Administrator',
                'role_id' => 1,
                'is_active' => true,
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
