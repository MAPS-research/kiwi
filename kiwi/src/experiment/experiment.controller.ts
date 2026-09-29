import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { InstructorClassGuard, JwtAuthGuard } from 'src/auth/auth.guard';
import { ExperimentService } from './experiment.service';
import {
  AssistantChatBody,
  AssistantChatResponse,
  ExperimentConfigBody,
  ExperimentResponse,
  StudentRosterEntry,
  SystemPromptsResponse,
  VariantAnalyticsResponse,
  VariantCountResponse,
} from './dto/experiment.dto';

// Free-form Config JSON response (validate + export return the raw config).
const CONFIG_RESPONSE = {
  schema: { type: 'object', additionalProperties: true },
} as const;

/**
 * Instructor/admin-facing CRUD for learning experiments, scoped to one class.
 * Guarded by InstructorClassGuard which reads classId from params/body.
 */
@ApiParam({ name: 'classID', type: String })
@Controller('class/:classID/experiments')
export class ExperimentController {
  private readonly logger = new Logger(ExperimentController.name);

  constructor(private readonly experimentService: ExperimentService) {}

  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiCreatedResponse({ type: ExperimentResponse })
  @Post()
  async create(
    @Param('classID') classId: string,
    @Body() body: ExperimentConfigBody,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.experimentService.createExperiment({
      classId,
      createdBy: req.user.sub,
      config: body.config,
    });
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse(CONFIG_RESPONSE)
  @Post('validate')
  async validate(@Body() body: ExperimentConfigBody) {
    // Returns the parsed config or throws 400 with issue details.
    return this.experimentService.validateConfig(body.config);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: ExperimentResponse, isArray: true })
  @Get()
  async list(@Param('classID') classId: string) {
    return this.experimentService.listForClass(classId);
  }

  // Effective default system prompts for the class (class overrides merged over
  // platform defaults) — used by the form to pre-fill each variant's prompts.
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: SystemPromptsResponse })
  @Get('defaults')
  async defaults(@Param('classID') classId: string) {
    return this.experimentService.defaultSystemPrompts(classId);
  }

  // Enrolled students of the class — for the form's email validation + random
  // assignment. (Own endpoint so the response shape is reliably typed.)
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: StudentRosterEntry, isArray: true })
  @Get('roster')
  async roster(@Param('classID') classId: string) {
    return this.experimentService.studentRoster(classId);
  }

  // Conversational design assistant (uses the system chat model). Returns a
  // reply and, when the design is ready, a validated Config JSON to pre-fill
  // the form. Drives the floating chat / webmcp flow.
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: AssistantChatResponse })
  @Post('assistant')
  async assistant(
    @Param('classID') classId: string,
    @Body() body: AssistantChatBody,
  ) {
    return this.experimentService.assistantChat(classId, body.messages ?? []);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: ExperimentResponse })
  @Get(':experimentId')
  async get(
    @Param('classID') classId: string,
    @Param('experimentId') experimentId: string,
  ) {
    return this.experimentService.getForClass(experimentId, classId);
  }

  // Edit an existing experiment's config (name/description/variants/etc).
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: ExperimentResponse })
  @Put(':experimentId')
  async update(
    @Param('classID') classId: string,
    @Param('experimentId') experimentId: string,
    @Body() body: ExperimentConfigBody,
  ) {
    await this.experimentService.getForClass(experimentId, classId);
    return this.experimentService.updateExperiment(experimentId, body.config);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: ExperimentResponse })
  @Post(':experimentId/activate')
  async activate(
    @Param('classID') classId: string,
    @Param('experimentId') experimentId: string,
  ) {
    await this.experimentService.getForClass(experimentId, classId);
    return this.experimentService.activate(experimentId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: ExperimentResponse })
  @Post(':experimentId/complete')
  async complete(
    @Param('classID') classId: string,
    @Param('experimentId') experimentId: string,
  ) {
    await this.experimentService.getForClass(experimentId, classId);
    return this.experimentService.complete(experimentId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: VariantCountResponse, isArray: true })
  @Get(':experimentId/assignments')
  async assignmentCounts(
    @Param('classID') classId: string,
    @Param('experimentId') experimentId: string,
  ) {
    await this.experimentService.getForClass(experimentId, classId);
    return this.experimentService.assignmentCounts(experimentId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: VariantAnalyticsResponse, isArray: true })
  @Get(':experimentId/analytics')
  async analytics(
    @Param('classID') classId: string,
    @Param('experimentId') experimentId: string,
  ) {
    await this.experimentService.getForClass(experimentId, classId);
    return this.experimentService.analytics(experimentId);
  }

  // Export the config as a shareable template (classId nulled). Re-import by
  // POSTing the returned config to `create` on the target class.
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse(CONFIG_RESPONSE)
  @Get(':experimentId/export')
  async export(
    @Param('classID') classId: string,
    @Param('experimentId') experimentId: string,
  ) {
    await this.experimentService.getForClass(experimentId, classId);
    return this.experimentService.exportConfig(experimentId);
  }
}
