import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type SchoolClassOption = {
    id: string;
    name: string;
    status?: 'active' | 'inactive';
};

export function ClassSelect({
    classes,
    id,
    name,
    defaultValue,
}: {
    classes: SchoolClassOption[];
    id: string;
    name: string;
    defaultValue?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>Class</Label>
            <Select name={name} defaultValue={defaultValue}>
                <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                    {classes
                        .filter(
                            (schoolClass) =>
                                schoolClass.status !== 'inactive' ||
                                schoolClass.id === defaultValue,
                        )
                        .map((schoolClass) => (
                            <SelectItem
                                key={schoolClass.id}
                                value={schoolClass.id}
                            >
                                {schoolClass.name}
                            </SelectItem>
                        ))}
                </SelectContent>
            </Select>
        </div>
    );
}
