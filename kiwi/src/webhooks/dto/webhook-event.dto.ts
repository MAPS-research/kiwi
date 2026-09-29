import { IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WebhookEventDto {
  @ApiProperty({
    description: 'The type of event being triggered',
    example: 'user.created',
    enum: [
      'user.created',
      'user.updated',
      'user.enroll',
      'class.created',
      'class.enrollment',
      'interaction.created',
      'document.uploaded',
      'test.event',
      '*',
    ],
  })
  @IsString()
  event: string;

  @ApiProperty({
    description: 'Event payload containing relevant data for the event',
    example: {
      user: {
        id: 'user-123',
        email: 'user@example.com',
        systemRole: 'user',
      },
      timestamp: '2024-01-01T00:00:00Z',
    },
  })
  @IsObject()
  data: any;
}
