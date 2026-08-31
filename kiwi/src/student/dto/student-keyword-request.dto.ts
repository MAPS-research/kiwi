import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber } from 'class-validator';

export class RefreshKeywordsRequest {
    @ApiProperty({
        description: 'The ID of the lecture (PDF document ID)',
        example: 'lecture-123',
    })
    @IsString()
    @IsNotEmpty()
    lectureId: string;

    @ApiProperty({
        description: 'The ID of the class',
        example: 'class-456',
    })
    @IsString()
    @IsNotEmpty()
    classId: string;

    @ApiProperty({
        description: 'Force refresh even if keywords already exist',
        example: false,
        required: false,
    })
    @IsOptional()
    force?: boolean;
}

export class KeywordData {
    @ApiProperty({
        description: 'The keyword text',
        example: 'neural networks',
    })
    text: string;

    @ApiProperty({
        description: 'The frequency/count of the keyword',
        example: 15,
    })
    count: number;

    @ApiProperty({
        description: 'Questions related to this keyword',
        example: ['What is a neural network?', 'How do neural networks work?'],
    })
    questions: string[];

    @ApiProperty({
        description: 'Related questions for this keyword',
        example: ['What are the types of neural networks?', 'What is deep learning?'],
    })
    relatedQuestions: string[];
}

export class GetKeywordsRequest {
    @ApiProperty({
        description: 'The ID of the lecture (PDF document ID)',
        example: 'lecture-123',
    })
    @IsString()
    @IsNotEmpty()
    lectureId: string;

    @ApiProperty({
        description: 'The ID of the class',
        example: 'class-456',
    })
    @IsString()
    @IsNotEmpty()
    classId: string;
}

export class RefreshKeywordsResponse {
    @ApiProperty({
        description: 'Success status',
        example: true,
    })
    success: boolean;

    @ApiProperty({
        description: 'Status message',
        example: 'Keywords refresh started successfully',
    })
    message: string;

    @ApiProperty({
        description: 'Current status of the keyword generation',
        example: 'processing',
    })
    status: string;

    @ApiProperty({
        description: 'The ID of the lecture keyword record',
        example: 'keyword-record-789',
    })
    keywordId: string;
}

export class GetKeywordsResponse {
    @ApiProperty({
        description: 'Success status',
        example: true,
    })
    success: boolean;

    @ApiProperty({
        description: 'Status message',
        example: 'Keywords retrieved successfully',
    })
    message: string;

    @ApiProperty({
        description: 'Status of the keyword generation',
        example: 'completed',
    })
    status: string;

    @ApiProperty({
        description: 'Array of keyword data',
        type: [KeywordData],
    })
    keywords: KeywordData[];

    @ApiProperty({
        description: 'Timestamp when keywords were last updated',
        example: '2024-01-01T00:00:00.000Z',
    })
    updatedAt: string;
}

export class KeywordStatusResponse {
    @ApiProperty({
        description: 'Success status',
        example: true,
    })
    success: boolean;

    @ApiProperty({
        description: 'Status message',
        example: 'Keywords are ready',
    })
    message: string;

    @ApiProperty({
        description: 'Current status of the keyword generation',
        example: 'completed',
    })
    status: string;

    @ApiProperty({
        description: 'Progress percentage (0-100)',
        example: 100,
    })
    progress: number;

    @ApiProperty({
        description: 'Timestamp when keywords were last updated',
        example: '2024-01-01T00:00:00.000Z',
    })
    updatedAt: string;
} 