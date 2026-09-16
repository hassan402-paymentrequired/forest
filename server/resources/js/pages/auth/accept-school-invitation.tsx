import { Form, Head } from '@inertiajs/react';
import { School as SchoolIcon } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import schoolInvitations from '@/routes/school-invitations';

type Props = {
    token: string;
    invitation: {
        email: string;
        school_name: string;
    };
};

export default function AcceptSchoolInvitation({ token, invitation }: Props) {
    return (
        <>
            <Head title="Accept your invitation" />

            <div className="border-border bg-muted/30 mb-6 flex items-center gap-3 rounded-lg border p-4">
                <SchoolIcon className="text-muted-foreground size-5 shrink-0" />
                <div className="flex flex-1 items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                        {invitation.school_name}
                    </span>
                    <Badge variant="secondary">Ministry Invitation</Badge>
                </div>
            </div>

            <Form
                {...schoolInvitations.store.form(token)}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Your name</Label>
                            <Input
                                id="name"
                                name="name"
                                required
                                autoFocus
                                autoComplete="name"
                                placeholder="Full name"
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={invitation.email}
                                disabled
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                autoComplete="new-password"
                                placeholder="Password"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">
                                Confirm password
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                required
                                autoComplete="new-password"
                                placeholder="Confirm password"
                            />
                            <InputError
                                message={errors.password_confirmation}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={processing}
                        >
                            {processing && <Spinner />}
                            Accept Invitation
                        </Button>
                    </>
                )}
            </Form>
        </>
    );
}

AcceptSchoolInvitation.layout = {
    title: 'Accept your invitation',
    description: "You're setting up your school's account",
};
