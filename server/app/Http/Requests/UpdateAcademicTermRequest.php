<?php

namespace App\Http\Requests;

use App\Enums\TermName;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAcademicTermRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                Rule::enum(TermName::class),
                Rule::unique('academic_terms', 'name')
                    ->where('academic_session_id', $this->route('academic_term')->academic_session_id)
                    ->ignore($this->route('academic_term')),
            ],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
        ];
    }
}
