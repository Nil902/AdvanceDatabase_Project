<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

// Labels here must match the relationship options offered in the frontend
// family-management page — Family/AddMemberRequest validates the incoming
// `relationship` against relationship_types.label.
class RelationshipTypeSeeder extends Seeder
{
    public function run(): void
    {
        $labels = ['Head', 'Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Grandchild', 'Other'];

        foreach ($labels as $label) {
            DB::table('relationship_types')->updateOrInsert(['label' => $label]);
        }
    }
}
