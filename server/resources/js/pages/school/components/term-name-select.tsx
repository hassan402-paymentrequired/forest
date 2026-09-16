import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { termLabel } from '../academic-terms';

export default function TermNameSelect({
    id,
    defaultValue,
}: {
    id: string;
    defaultValue?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>Term</Label>
            <Select name="name" defaultValue={defaultValue}>
                <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder="Select a term" />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(termLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}