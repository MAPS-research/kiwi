import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { InteractionService } from './interaction.service';

@Injectable()
export class InteractionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(InteractionInterceptor.name);
  constructor(
    // Inject your database service here
    private readonly interactionService: InteractionService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest() as {
      [x: string]: any;
      session: {
        userId: string;
        userSessionId: string;
      };
    };

    const userSession = request.session as {
      userId: string;
      userSessionId: string;
    };

    if (!userSession.userId || !userSession.userSessionId) {
      return next.handle(); // If user session does not exist, do nothing and proceed
    }

    // Do not store student/chat as it is SSE
    if (request.url === '/student/chat') {
      return next.handle();
    }

    const { userId, userSessionId } = userSession;

    const interactionAction = {
      name: 'backend-action',
      timestamp: new Date().toISOString(),
      context: {
        requestTimeStamp: new Date().toISOString(),
        request: request.body,
        responseTimeStamp: '',
        response: null,
      },
    };

    return next.handle().pipe(
      tap((data) => {
        interactionAction.context.responseTimeStamp = new Date().toISOString();
        interactionAction.context.response = data;

        // this.interactionService.addInteraction(
        //   userId,
        //   userSessionId,
        //   interactionAction,
        // );
        this.logger.debug('backend-interaction', {
          userId,
          userSessionId,
          interactionAction: JSON.stringify(interactionAction, null, 2),
        });
      }),
    );
  }
}
