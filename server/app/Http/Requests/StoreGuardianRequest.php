<?php

namespace App\Http\Requests;

use App\Enums\GuardianRelationship;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGuardianRequest extends FormRequest
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
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'relationship' => ['required', Rule::enum(GuardianRelationship::class)],
            'is_primary' => ['boolean'],
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => [
                Rule::exists('students', 'id')
                    ->where('school_id', $this->user('school')->school_id),
            ],
        ];
    }
}
