<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CitizenParent extends Model
{
    protected $table = 'citizen_parents';
    protected $primaryKey = 'citizen_parent_id';
    public $timestamps = false;

    protected $fillable = ['citizen_id', 'parent_id', 'relationship_type']; // father | mother

    public function citizen()
    {
        return $this->belongsTo(Citizen::class, 'citizen_id', 'citizen_id');
    }

    public function parent()
    {
        return $this->belongsTo(ParentRecord::class, 'parent_id', 'parent_id');
    }
}
