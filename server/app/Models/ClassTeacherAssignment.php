<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Database\Factories\ClassTeacherAssignmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Which teacher is the class (form) teacher for a class in a given academic
 * term — one teacher per class per term.
 *
 * @property string $id
 * @property string $school_id
 * @property string $school_class_id
 * @property string $teacher_id
 * @property string $academic_term_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['school_id', 'school_class_id', 'teacher_id', 'academic_term_id'])]
class ClassTeacherAssignment extends Model
{
    /** @use HasFactory<ClassTeacherAssignmentFactory> */
    use BelongsToSchool, HasFactory, HasUlids;

    /**
     * Get the class this assignment is for.
     *
     * @return BelongsTo<SchoolClass, $this>
     */
    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class);
    }

    /**
     * Get the assigned teacher.
     *
     * @return BelongsTo<Teacher, $this>
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    /**
     * Get the academic term this assignment is for.
     *
     * @return BelongsTo<AcademicTerm, $this>
     */
    public function academicTerm(): BelongsTo
    {
        return $this->belongsTo(AcademicTerm::class);
    }
}
