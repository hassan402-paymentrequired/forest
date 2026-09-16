<?php

namespace App\Http\Requests;

use App\Enums\TeacherStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTeacherRequest extends FormRequest
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
            'subjects' => ['nullable', 'array'],
            'subjects.*' => ['string', 'max:100'],
            'status' => ['required', Rule::enum(TeacherStatus::class)],
        ];
    }
}
