<?php

namespace App\Http\Requests;

use App\Enums\StudentStatus;
use App\Models\AcademicTerm;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStudentRequest extends FormRequest
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
                    ->where('school_id', $this->user('school')->school_id),
            ],
            'status' => ['required', Rule::enum(StudentStatus::class)],
        ];
    }

    /**
     * A student's class can only be (re)assigned once the school has a
     * current academic term set — that's what determines which session
     * the enrollment belongs to.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if (! AcademicTerm::query()->where('is_current', true)->exists()) {
                $validator->errors()->add('class_id', __('Set a current academic term before assigning classes.'));
            }
        });
    }
}
