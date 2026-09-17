import {
  applyDecorators,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { isDevAuthEnabled } from './dev-auth';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const DevAuthEnabled = () =>
  applyDecorators(
    (target: any, key: string | symbol, descriptor: PropertyDescriptor) => {
      const handler = descriptor.value;
      const guarded = function (this: unknown, ...args: unknown[]) {
        if (!isDevAuthEnabled()) {
          throw new NotFoundException('Not found.');
        }
        return handler.apply(this, args);
      };
      // Keep any metadata already attached to the original handler.
      for (const metaKey of Reflect.getMetadataKeys(handler)) {
        Reflect.defineMetadata(
          metaKey,
          Reflect.getMetadata(metaKey, handler),
          guarded,
        );
      }
      Object.defineProperty(guarded, 'name', { value: handler.name });
      descriptor.value = guarded;
    },
    // Swagger visibility is decided at startup; the check above is what counts.
    ...(isDevAuthEnabled() ? [] : [ApiExcludeEndpoint()]),
  );
