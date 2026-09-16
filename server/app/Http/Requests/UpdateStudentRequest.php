<?php

namespace App\Http\Requests;

use App\Enums\StudentStatus;
use Illuminate\Contracts\Validation\ValidationRule;
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
            'class_id' => [
                'required',
                Rule::exists('school_classes', 'id')
                    ->where('school_id', $this->user('school')->school_id),
            ],
            'status' => ['required', Rule::enum(StudentStatus::class)],
        ];
    }
}
