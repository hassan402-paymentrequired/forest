<?php

namespace App\Models;

use App\Enums\TeacherStatus;
use App\Models\Concerns\BelongsToSchool;
use Database\Factories\TeacherFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $school_id
 * @property string $name
 * @property string|null $email
 * @property string|null $phone
 * @property TeacherStatus $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['school_id', 'name', 'email', 'phone', 'status'])]
class Teacher extends Model
{
    /** @use HasFactory<TeacherFactory> */
    use BelongsToSchool, HasFactory, HasUlids;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => TeacherStatus::class,
        ];
    }

    /**
     * Get the subjects this teacher is qualified to teach.
     *
     * @return BelongsToMany<Subject, $this>
     */
    public function subjects(): BelongsToMany
    {
        return $this->belongsToMany(Subject::class);
    }

    /**
     * Get the grades this teacher has recorded.
     *
     * @return HasMany<Grade, $this>
     */
    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    /**
     * Get this teacher's class assignments across all terms.
     *
     * @return HasMany<ClassTeacherAssignment, $this>
     */
    public function classAssignments(): HasMany
    {
        return $this->hasMany(ClassTeacherAssignment::class);
    }
}
