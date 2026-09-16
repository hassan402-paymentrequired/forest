<?php

namespace Database\Factories;

use App\Models\AcademicSession;
use App\Models\Enrollment;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Enrollment>
 */
class EnrollmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'school_id' => School::factory(),
            'student_id' => fn (array $attributes) => Student::factory()->create(['school_id' => $attributes['school_id']])->id,
            'school_class_id' => fn (array $attributes) => SchoolClass::factory()->create(['school_id' => $attributes['school_id']])->id,
            'academic_session_id' => fn (array $attributes) => AcademicSession::factory()->create(['school_id' => $attributes['school_id']])->id,
        ];
    }
}
