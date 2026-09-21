<?php

namespace App\Models;

use App\Enums\EducationDistrict;
use App\Enums\Lga;
use App\Enums\SchoolLevel;
use App\Enums\SchoolStatus;
use App\Enums\SchoolType;
use Database\Factories\SchoolFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $name
 * @property string|null $code
 * @property string $contact_email
 * @property SchoolType|null $type
 * @property SchoolLevel|null $level
 * @property Lga|null $lga
 * @property EducationDistrict|null $education_district
 * @property string|null $address
 * @property SchoolStatus $status
 * @property string|null $invited_by
 * @property Carbon|null $activated_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'name',
    'code',
    'contact_email',
    'type',
    'level',
    'lga',
    'education_district',
    'address',
    'status',
    'invited_by',
    'activated_at',
])]
class School extends Model
{
    /** @use HasFactory<SchoolFactory> */
    use HasFactory, HasUlids;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => SchoolStatus::class,
            'type' => SchoolType::class,
            'level' => SchoolLevel::class,
            'lga' => Lga::class,
            'education_district' => EducationDistrict::class,
            'activated_at' => 'datetime',
        ];
    }

    /**
     * Get the ministry user who invited this school.
     *
     * @return BelongsTo<MinistryUser, $this>
     */
    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(MinistryUser::class, 'invited_by');
    }

    /**
     * Get the ministry announcements sent to this school, with when it read each.
     *
     * @return BelongsToMany<Announcement, $this>
     */
    public function announcements(): BelongsToMany
    {
        return $this->belongsToMany(Announcement::class)->withPivot('read_at')->withTimestamps();
    }

    /**
     * Get the invitations issued for this school.
     *
     * @return HasMany<SchoolInvitation, $this>
     */
    public function invitations(): HasMany
    {
        return $this->hasMany(SchoolInvitation::class);
    }

    /**
     * Get the platform accounts belonging to this school.
     *
     * @return HasMany<SchoolUser, $this>
     */
    public function schoolUsers(): HasMany
    {
        return $this->hasMany(SchoolUser::class);
    }

    /**
     * Get the teacher records belonging to this school.
     *
     * @return HasMany<Teacher, $this>
     */
    public function teachers(): HasMany
    {
        return $this->hasMany(Teacher::class);
    }

    /**
     * Get the classes belonging to this school.
     *
     * @return HasMany<SchoolClass, $this>
     */
    public function classes(): HasMany
    {
        return $this->hasMany(SchoolClass::class);
    }

    /**
     * Get the academic sessions belonging to this school.
     *
     * @return HasMany<AcademicSession, $this>
     */
    public function academicSessions(): HasMany
    {
        return $this->hasMany(AcademicSession::class);
    }

    /**
     * Get the attendance records belonging to this school.
     *
     * @return HasMany<Attendance, $this>
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * Get the subjects offered at this school.
     *
     * @return HasMany<Subject, $this>
     */
    public function subjects(): HasMany
    {
        return $this->hasMany(Subject::class);
    }

    /**
     * Get the grades recorded at this school.
     *
     * @return HasMany<Grade, $this>
     */
    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    /**
     * Get the student records belonging to this school.
     *
     * @return HasMany<Student, $this>
     */
    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    /**
     * Get the guardian records belonging to this school.
     *
     * @return HasMany<Guardian, $this>
     */
    public function guardians(): HasMany
    {
        return $this->hasMany(Guardian::class);
    }

    /**
     * Get the enrollments recorded at this school.
     *
     * @return HasMany<Enrollment, $this>
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }
}
