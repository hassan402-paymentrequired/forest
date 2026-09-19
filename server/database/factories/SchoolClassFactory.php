<?php

namespace Database\Factories;

use App\Enums\RecordStatus;
use App\Models\School;
use App\Models\SchoolClass;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SchoolClass>
 */
class SchoolClassFactory extends Factory
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
            'status' => RecordStatus::Active,
            'name' => fake()->randomElement(['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'])
                .' '.fake()->randomElement(['A', 'B', 'C']),
        ];
    }

    /**
     * Indicate that the record is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => RecordStatus::Inactive,
        ]);
    }
}
