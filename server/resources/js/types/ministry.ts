export type Option = { value: string; label: string };

export type FilterOptions = {
    lgas: Option[];
    districts: Option[];
    types: Option[];
    levels: Option[];
};

/** The filters every ministry analytics page shares. */
export type ScopeFilters = {
    lga: string;
    education_district: string;
    type: string;
    level: string;
};

export type Totals = {
    schools: number;
    students: number;
    teachers: number;
    teachers_on_leave: number;
    classes: number;
    student_teacher_ratio: number | null;
    attendance_rate: number | null;
    grades_recorded: number;
    average_score: number | null;
    pass_rate: number | null;
};

/** One school's headline numbers (see SchoolMetrics::rows()). */
export type SchoolRow = {
    id: string;
    name: string;
    code: string | null;
    status: 'active' | 'suspended';
    type: string | null;
    level: string | null;
    lga: string | null;
    lga_label: string | null;
    education_district: string | null;
    district_label: string | null;
    has_current_term: boolean;
    students_active: number;
    teachers_active: number;
    teachers_on_leave: number;
    classes_active: number;
    subjects_active: number;
    student_teacher_ratio: number | null;
    attendance_present: number;
    attendance_records: number;
    attendance_rate: number | null;
    last_attendance_date: string | null;
    grades_recorded: number;
    grades_passing: number;
    average_score: number | null;
    pass_rate: number | null;
    students_without_guardian: number;
    classes_without_teacher: number | null;
    subjects_without_teacher: number;
    teachers_without_subjects: number;
};

export type Flag = { key: string; label: string; reason: string };
export type Issue = { key: string; label: string; detail: string };

/** Combined numbers for one LGA or education district. */
export type GroupTotals = Totals & { value: string; label: string };
