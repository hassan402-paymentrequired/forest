<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTeacherRequest extends FormRequest
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
            'joined_at' => ['required', 'date', 'before_or_equal:today'],
            'subject_ids' => ['nullable', 'array'],
            'subject_ids.*' => [
                Rule::exists('subjects', 'id')
                    ->where('school_id', $this->user('school')->school_id),
            ],
        ];
    }
}
