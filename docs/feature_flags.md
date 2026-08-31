# Adding New Feature Flags

This document outlines the steps required to add new feature flags to the system.

## 1. Add the Feature to the Database

1. Open the `prisma/schema.prisma` file.
2. Add the new feature to the `Feature` enum:
    ```sql
    enum Feature {
      ...
      NewFeature
    }
    ```
3. Use Prisma to generate the migration:
    ```sh
    npx prisma migrate dev --name "add_new_feature_flag"
    ```

## 2. Create a Guard for the Feature

1. Open `src/feature-flags/feature-flags.guard.ts`.
2. Create a new guard class for the feature:
    ```ts
    @Injectable()
    export class FeatureFlagGuardNewFeature implements CanActivate {
      constructor(private featureFlagsService: FeatureFlagsService) {}

      async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.session.userId;
        if (!userId) {
          throw new ForbiddenException();
        }

        const isEnabled = await this.featureFlagsService.isFeatureEnabled({
          feature: 'NewFeature',
          userId,
        });

        if (!isEnabled) {
          return false;
        }

        return true;
      }
    }
    ```

## 3. Place the Guard in the Correct Locations

1. Open the relevant controller file (e.g., `src/feature-flags/feature-flags.controller.ts`).
2. Apply the guard to the necessary endpoints:
    ```ts
    @UseGuards(FeatureFlagGuardNewFeature)
    @Get('new-feature-endpoint')
    async newFeatureEndpoint(@Query('userId') userId: string) {
      // Endpoint logic
    }
    ```

## 4. UI

### 4.1 Make Sure UI Can Handle 403 from Guard for the Feature

1. Update the frontend code to handle 403 responses from the API.
2. Display an appropriate message to the user when access is denied.

### 4.2 Add a “Guard” for UI as Well to Make Sure the Feature is Not Available to the User

1. Update the frontend code to check if the feature is enabled for the user.
2. Hide or disable UI elements related to the feature if it is not enabled.

Example:
```js
  // Check Available Features
  const { availableFeatures } = useAuth();
  // Check if the user has the feature to use Qwen
  const qwenEnabled = featureFlagChecker({
    featureFlag: "QwenModel",
    availableFeatures: availableFeatures,
    classId: selectedClass?.classID,
  });
```