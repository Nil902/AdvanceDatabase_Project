<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DependencyRegistry extends Model
{
    protected $table = 'dependency_registry';
    protected $primaryKey = 'dependency_id';
    public $timestamps = false;

    protected $fillable = ['head_id', 'dependent_id', 'dependency_type', 'start_date', 'end_date'];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function head()
    {
        return $this->belongsTo(Citizen::class, 'head_id', 'citizen_id');
    }

    public function dependent()
    {
        return $this->belongsTo(Citizen::class, 'dependent_id', 'citizen_id');
    }
}
