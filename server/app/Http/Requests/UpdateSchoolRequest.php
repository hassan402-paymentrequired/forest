<?php

namespace App\Http\Requests;

use App\Enums\EducationDistrict;
use App\Enums\Lga;
use App\Enums\SchoolLevel;
use App\Enums\SchoolType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSchoolRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', Rule::unique('schools', 'code')->ignore($this->route('school'))],
            'type' => ['nullable', Rule::enum(SchoolType::class)],
            'level' => ['nullable', Rule::enum(SchoolLevel::class)],
            'lga' => ['nullable', Rule::enum(Lga::class)],
            'education_district' => ['nullable', Rule::enum(EducationDistrict::class)],
            'address' => ['nullable', 'string', 'max:255'],
        ];
    }
}
