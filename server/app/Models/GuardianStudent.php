<?php

namespace App\Models;

use App\Enums\GuardianRelationship;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * @property string $guardian_id
 * @property string $student_id
 * @property GuardianRelationship $relationship
 * @property bool $is_primary
 */
class GuardianStudent extends Pivot
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'relationship' => GuardianRelationship::class,
            'is_primary' => 'boolean',
        ];
    }
}
