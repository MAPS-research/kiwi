import { ApiProperty } from '@nestjs/swagger';

export class QueryRequest {
  @ApiProperty()
  query: string;
  @ApiProperty()
  ids?: string[];
  @ApiProperty({
    required: false,
    description:
      'If provided (and no ids), use all isLlm=true docs from this material',
  })
  materialId?: string;
  @ApiProperty()
  pageNumber?: number;
  @ApiProperty()
  n?: number;
}

class QueryResult {
  @ApiProperty()
  id: string;
  @ApiProperty()
  documentId: string;
  @ApiProperty()
  text: string;
  @ApiProperty()
  documentPageNumber: string;
  @ApiProperty()
  chunk: JSON;
}

export class QueryResponse {
  @ApiProperty()
  message: string;
  @ApiProperty({ type: [QueryResult] })
  results: QueryResult[];
}
