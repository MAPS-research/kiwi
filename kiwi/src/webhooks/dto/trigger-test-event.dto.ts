import { ApiProperty } from '@nestjs/swagger';

/**
 * Request DTO for triggering test webhook events
 */
export class TriggerTestEventDto {
  @ApiProperty({
    description: 'Event type to trigger',
    example: 'test.event',
  })
  event: string;

  @ApiProperty({
    description: 'Event data payload',
    type: 'object',
    example: { message: 'Test event data' },
  })
  data: any;
}
