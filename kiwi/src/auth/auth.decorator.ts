import {
  applyDecorators,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const DevAuthEnabled = () => {
  const isDevAuthEnabled = process.env.DEV_AUTH === 'true';

  return applyDecorators(
    (target: any, key: string | symbol, descriptor: PropertyDescriptor) => {
      if (!isDevAuthEnabled) {
        descriptor.value = () => {
          throw new NotFoundException('Not found.');
        };
      }
    },
    ...(isDevAuthEnabled ? [] : [ApiExcludeEndpoint()]),
  );
};
