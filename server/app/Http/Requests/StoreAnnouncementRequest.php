<?php

namespace App\Http\Requests;

use App\Enums\SchoolStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAnnouncementRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
            'audience' => ['required', Rule::in(['all', 'selected'])],
            'school_ids' => ['exclude_unless:audience,selected', 'required', 'array', 'min:1'],
            'school_ids.*' => [
                'string',
                Rule::exists('schools', 'id')->where('status', SchoolStatus::Active->value),
            ],
        ];
    }
}
