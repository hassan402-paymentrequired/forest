<?php

namespace App\Http\Requests;

use App\Enums\AttendanceStatus;
use App\Models\AcademicTerm;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAttendanceRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

        return [
            'class_id' => [
                'required',
                Rule::exists('school_classes', 'id')
                    ->where('school_id', $this->user('school')->school_id),
            ],
            'date' => ['required', 'date', 'before_or_equal:today'],
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => [
                'required',
                'distinct',
                Rule::exists('enrollments', 'student_id')->where(function ($query) use ($currentTerm) {
                    $query->where('school_id', $this->user('school')->school_id)
                        ->where('school_class_id', $this->input('class_id'))
                        ->when($currentTerm, fn ($query) => $query->where('academic_session_id', $currentTerm->academic_session_id));
                }),
            ],
            'records.*.status' => ['required', Rule::enum(AttendanceStatus::class)],
        ];
    }

    /**
     * Attendance can only be taken once the school has a current academic
     * term, and only for a date that falls within it.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $currentTerm = AcademicTerm::query()->where('is_current', true)->first();

            if (! $currentTerm) {
                $validator->errors()->add('class_id', __('Set a current academic term before taking attendance.'));

                return;
            }

            $date = $this->input('date');

            if ($date && ($date < $currentTerm->start_date->toDateString() || $date > $currentTerm->end_date->toDateString())) {
                $validator->errors()->add('date', __('Date must fall within the current term.'));
            }
        });
    }
}
