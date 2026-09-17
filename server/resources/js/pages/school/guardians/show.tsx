import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { Users } from 'lucide-react';
import Heading from '@/components/heading';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import guardians from '@/routes/guardians';
import students from '@/routes/students';

type GuardianRelationship = 'father' | 'mother' | 'guardian' | 'other';

const relationshipLabel: Record<GuardianRelationship, string> = {
    father: 'Father',
    mother: 'Mother',
    guardian: 'Guardian',
    other: 'Other',
};

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

type Guardian = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
};

type Student = {
    id: string;
    name: string;
    admission_number: string | null;
    relationship: GuardianRelationship;
    is_primary: boolean;
};

export default function GuardianShow({
    guardian,
    students: linkedStudents,
}: {
    guardian: Guardian;
    students: Student[];
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Guardians', href: guardians.index() },
            { title: guardian.name, href: guardians.show(guardian.id) },
        ],
    });

    return (
        <>
            <Head title={guardian.name} />

            <div className="space-y-6 p-4">
                <Heading
                    title={guardian.name}
                    description={
                        [guardian.email, guardian.phone]
                            .filter(Boolean)
                            .join(' · ') || undefined
                    }
                />

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="text-muted-foreground size-4" />
                            Children
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {linkedStudents.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No students linked yet.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {linkedStudents.map((student) => (
                                    <li
                                        key={student.id}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <Link
                                            href={students.show(student.id)}
                                            className="flex items-center gap-3 hover:underline"
                                        >
                                            <Avatar>
                                                <AvatarFallback className="text-xs">
                                                    {initials(student.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">
                                                    {student.name}
                                                </div>
                                                <div className="text-muted-foreground">
                                                    {student.admission_number ??
                                                        'No admission number'}
                                                </div>
                                            </div>
                                        </Link>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">
                                                {
                                                    relationshipLabel[
                                                        student.relationship
                                                    ]
                                                }
                                            </Badge>
                                            {student.is_primary && (
                                                <Badge>Primary</Badge>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
