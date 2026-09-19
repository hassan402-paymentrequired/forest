<?php

namespace App\Http\Requests;

use App\Enums\GuardianRelationship;
use App\Enums\RecordStatus;
use App\Models\AcademicTerm;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStudentRequest extends FormRequest
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
            'admission_number' => ['nullable', 'string', 'max:50'],
            'admission_date' => ['nullable', 'date'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'class_id' => [
                'required',
                Rule::exists('school_classes', 'id')
                    ->where('school_id', $this->user('school')->school_id)
                    ->where('status', RecordStatus::Active->value),
            ],
            'guardian_name' => ['nullable', 'string', 'max:255'],
            'guardian_email' => ['nullable', 'string', 'email', 'max:255'],
            'guardian_phone' => ['nullable', 'string', 'max:30'],
            'guardian_relationship' => ['required_with:guardian_name', Rule::enum(GuardianRelationship::class)],
        ];
    }

    /**
     * A student can only be enrolled into a class once the school has a
     * current academic term set — that's what determines which session
     * the enrollment belongs to.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if (! AcademicTerm::query()->where('is_current', true)->exists()) {
                $validator->errors()->add('class_id', __('Set a current academic term before adding students.'));
            }
        });
    }
}
