<?php

namespace Database\Factories;

use App\Enums\AuditAction;
use App\Models\MinistryAuditLog;
use App\Models\MinistryUser;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MinistryAuditLog>
 */
class MinistryAuditLogFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'ministry_user_id' => MinistryUser::factory(),
            'action' => fake()->randomElement(AuditAction::cases()),
            'subject_type' => null,
            'subject_id' => null,
            'subject_label' => fake()->company(),
            'metadata' => null,
        ];
    }
}
