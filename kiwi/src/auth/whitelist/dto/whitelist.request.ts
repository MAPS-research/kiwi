import { ApiProperty } from '@nestjs/swagger';

export class AddWhitelistRequest {
  @ApiProperty()
  email: string;
}

export class UpdateWhitelistRequest {
  @ApiProperty()
  email: string;
  @ApiProperty({ enum: ['enabled', 'disabled'] })
  status: 'enabled' | 'disabled';
}

class Entry {
  @ApiProperty()
  email: string;
  @ApiProperty()
  status: string;
}

export class ListWhitelistResponse {
  @ApiProperty({ type: [Entry] })
  entries: Entry[];
}
