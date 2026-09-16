<?php

namespace App\Http\Requests;

use App\Models\AcademicTerm;
use App\Models\Grade;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGradeRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();
        $schoolId = $this->user('school')->school_id;

        return [
            'class_id' => [
                'required',
                Rule::exists('school_classes', 'id')->where('school_id', $schoolId),
            ],
            'subject_id' => [
                'required',
                Rule::exists('subjects', 'id')->where('school_id', $schoolId),
            ],
            'teacher_id' => [
                'nullable',
                Rule::exists('teachers', 'id')->where('school_id', $schoolId),
            ],
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => [
                'required',
                'distinct',
                Rule::exists('enrollments', 'student_id')->where(function ($query) use ($currentTerm, $schoolId) {
                    $query->where('school_id', $schoolId)
                        ->where('school_class_id', $this->input('class_id'))
                        ->when($currentTerm, fn ($query) => $query->where('academic_session_id', $currentTerm->academic_session_id));
                }),
            ],
            'records.*.ca_score' => ['required', 'integer', 'min:0', 'max:'.Grade::CA_MAX],
            'records.*.exam_score' => ['required', 'integer', 'min:0', 'max:'.Grade::EXAM_MAX],
        ];
    }

    /**
     * Grades can only be recorded once the school has a current academic
     * term — that's what a grade is scoped by.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if (! AcademicTerm::query()->where('is_current', true)->exists()) {
                $validator->errors()->add('class_id', __('Set a current academic term before recording grades.'));
            }
        });
    }
}
