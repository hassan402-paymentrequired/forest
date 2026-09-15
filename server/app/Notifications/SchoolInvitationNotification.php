<?php

namespace App\Notifications;

use App\Models\SchoolInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SchoolInvitationNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public SchoolInvitation $invitation)
    {
        //
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('You’ve been invited to join the platform')
            ->greeting('Hello!')
            ->line('The Ministry of Education has invited your school to join the platform.')
            ->action('Accept Invitation', url('/school-invitations/'.$this->invitation->token))
            ->line('This invitation expires on '.$this->invitation->expires_at->toFormattedDateString().'.');
    }
}
