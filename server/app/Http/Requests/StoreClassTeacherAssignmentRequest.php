<?php

namespace App\Http\Requests;

use App\Enums\TeacherStatus;
use App\Models\AcademicTerm;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreClassTeacherAssignmentRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'teacher_id' => [
                'required',
                Rule::exists('teachers', 'id')
                    ->where('school_id', $this->user('school')->school_id)
                    ->where('status', TeacherStatus::Active->value),
            ],
        ];
    }

    /**
     * A class teacher can only be assigned once the school has a current
     * academic term set — that's the term the assignment is made for.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if (! AcademicTerm::query()->where('is_current', true)->exists()) {
                $validator->errors()->add('teacher_id', __('Set a current academic term before assigning a class teacher.'));
            }
        });
    }
}
