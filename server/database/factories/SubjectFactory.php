<?php

namespace Database\Factories;

use App\Models\School;
use App\Models\Subject;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Subject>
 */
class SubjectFactory extends Factory
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
            'name' => fake()->unique()->randomElement([
                'Mathematics', 'English Language', 'Basic Science', 'Basic Technology',
                'Social Studies', 'Civic Education', 'Agricultural Science', 'Home Economics',
                'Physical Education', 'Computer Studies', 'French', 'Yoruba',
            ]),
        ];
    }
}
