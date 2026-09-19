<?php

namespace App\Models;

use App\Enums\RecordStatus;
use App\Models\Concerns\BelongsToSchool;
use Database\Factories\SchoolClassFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $school_id
 * @property string $name
 * @property RecordStatus $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['school_id', 'name', 'status'])]
class SchoolClass extends Model
{
    /** @use HasFactory<SchoolClassFactory> */
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
     * Get this class's enrollments across all sessions. Scope by
     * `academic_session_id` to get a single session's roster.
     *
     * @return HasMany<Enrollment, $this>
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /**
     * Get this class's attendance records across all terms.
     *
     * @return HasMany<Attendance, $this>
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * Get this class's grades across all terms.
     *
     * @return HasMany<Grade, $this>
     */
    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    /**
     * Get this class's teacher assignments across all terms. Scope by
     * `academic_term_id` to get the teacher for a single term.
     *
     * @return HasMany<ClassTeacherAssignment, $this>
     */
    public function teacherAssignments(): HasMany
    {
        return $this->hasMany(ClassTeacherAssignment::class);
    }
}
