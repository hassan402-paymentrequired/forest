<?php

namespace App\Models;

use App\Enums\RecordStatus;
use App\Models\Concerns\BelongsToSchool;
use Database\Factories\GuardianFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $school_id
 * @property string $name
 * @property string|null $email
 * @property string|null $phone
 * @property RecordStatus $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['school_id', 'name', 'email', 'phone', 'status'])]
class Guardian extends Model
{
    /** @use HasFactory<GuardianFactory> */
    use BelongsToSchool, HasFactory, HasUlids;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => RecordStatus::class,
        ];
    }

    /**
     * Get the students in this guardian's care.
     *
     * @return BelongsToMany<Student, $this, GuardianStudent>
     */
    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'guardian_student')
            ->using(GuardianStudent::class)
            ->withPivot(['relationship', 'is_primary'])
            ->withTimestamps();
    }
}
