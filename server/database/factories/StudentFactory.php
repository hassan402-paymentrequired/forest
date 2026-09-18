<?php

namespace Database\Factories;

use App\Enums\StudentStatus;
use App\Models\School;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Student>
 */
class StudentFactory extends Factory
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
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'admission_number' => fake()->unique()->numerify('ADM-####'),
            'admission_date' => fake()->dateTimeBetween('-3 years', 'now'),
            'date_of_birth' => fake()->dateTimeBetween('-18 years', '-5 years'),
            'status' => StudentStatus::Active,
        ];
    }

    /**
     * Indicate that the student has graduated.
     */
    public function graduated(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => StudentStatus::Graduated,
        ]);
    }
}
