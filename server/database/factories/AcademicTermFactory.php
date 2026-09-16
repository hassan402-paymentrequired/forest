<?php

namespace Database\Factories;

use App\Enums\TermName;
use App\Models\AcademicSession;
use App\Models\AcademicTerm;
use App\Models\School;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AcademicTerm>
 */
class AcademicTermFactory extends Factory
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
            'academic_session_id' => fn (array $attributes) => AcademicSession::factory()->create(['school_id' => $attributes['school_id']])->id,
            'name' => fake()->randomElement(TermName::cases()),
            'start_date' => fake()->dateTimeBetween('-1 year', 'now'),
            'end_date' => fake()->dateTimeBetween('now', '+3 months'),
            'is_current' => false,
        ];
    }

    /**
     * Indicate that this term is the current term for its school.
     */
    public function current(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_current' => true,
        ]);
    }
}
