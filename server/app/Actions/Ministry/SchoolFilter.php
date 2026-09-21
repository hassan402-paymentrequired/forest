<?php

namespace App\Actions\Ministry;

use App\Enums\EducationDistrict;
use App\Enums\Lga;
use App\Enums\SchoolLevel;
use App\Enums\SchoolStatus;
use App\Enums\SchoolType;
use App\Models\School;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Narrows the ministry's cross-school analytics to a group of schools.
 * Invited schools have no data yet, so only active and suspended schools
 * are ever part of the population.
 */
final readonly class SchoolFilter
{
    /**
     * @param  list<string>|null  $schoolIds
     */
    public function __construct(
        public ?Lga $lga = null,
        public ?EducationDistrict $educationDistrict = null,
        public ?SchoolType $type = null,
        public ?SchoolLevel $level = null,
        public ?array $schoolIds = null,
    ) {}

    public static function fromRequest(Request $request): self
    {
        return new self(
            lga: Lga::tryFrom((string) $request->query('lga')),
            educationDistrict: EducationDistrict::tryFrom((string) $request->query('education_district')),
            type: SchoolType::tryFrom((string) $request->query('type')),
            level: SchoolLevel::tryFrom((string) $request->query('level')),
        );
    }

    public static function forSchool(School $school): self
    {
        return new self(schoolIds: [$school->id]);
    }

    /**
     * @return Builder<School>
     */
    public function schools(): Builder
    {
        return School::query()
            ->whereIn('status', [SchoolStatus::Active, SchoolStatus::Suspended])
            ->when($this->lga, fn (Builder $query, Lga $lga) => $query->where('lga', $lga))
            ->when($this->educationDistrict, fn (Builder $query, EducationDistrict $district) => $query->where('education_district', $district))
            ->when($this->type, fn (Builder $query, SchoolType $type) => $query->where('type', $type))
            ->when($this->level, fn (Builder $query, SchoolLevel $level) => $query->where('level', $level))
            ->when($this->schoolIds, fn (Builder $query, array $ids) => $query->whereIn('id', $ids));
    }

    /**
     * The filters as the frontend sends and expects them back.
     *
     * @return array{lga: string, education_district: string, type: string, level: string}
     */
    public function toArray(): array
    {
        return [
            'lga' => $this->lga?->value ?? '',
            'education_district' => $this->educationDistrict?->value ?? '',
            'type' => $this->type?->value ?? '',
            'level' => $this->level?->value ?? '',
        ];
    }

    /**
     * Options for the filter dropdowns.
     *
     * @return array{lgas: list<array{value: string, label: string}>, districts: list<array{value: string, label: string}>, types: list<array{value: string, label: string}>, levels: list<array{value: string, label: string}>}
     */
    public static function options(): array
    {
        return [
            'lgas' => Lga::options(),
            'districts' => EducationDistrict::options(),
            'types' => SchoolType::options(),
            'levels' => SchoolLevel::options(),
        ];
    }
}
