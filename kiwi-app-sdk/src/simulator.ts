import type { KiwiContext, KiwiAppToken, SimulatorFixtures } from './types';
import type { DocumentChunksParams } from './ops.generated';

/**
 * Default Simulator fixtures, used when the app runs standalone (not embedded
 * by Kiwi) so you can build offline. Override any of them via
 * `createKiwiApp({ simulator: { … } })`.
 *
 * The op *types* are generator-emitted (see ops.generated.ts); these fixture
 * *values* stay hand-written on purpose — OpenAPI examples are too sparse to
 * make a useful offline demo, and they mirror the real response shapes.
 */

export const defaultContext: KiwiContext = {
  classId: 'demo-class-101',
  className: 'Calculus I (simulated)',
  userId: 'demo-user-1',
  username: 'ada',
  userRole: 'student',
  appId: 'demo-app',
  appSlug: 'demo',
  uiSlug: 'student',
  capabilities: ['ai'],
};

export function defaultToken(ctx: KiwiContext, appSlug: string): KiwiAppToken {
  const scopes = ['class:materials:chunks:read', 'context:student_learning:read'];
  const body = {
    sub: ctx.userId,
    type: 'app_token',
    appSlug: appSlug || 'demo',
    classId: ctx.classId,
    scopes,
  };
  const b64 =
    typeof btoa === 'function'
      ? btoa(JSON.stringify(body)).replace(/=+$/, '')
      : 'simulated';
  return { accessToken: `sim.${b64}.sim`, scopes, expiresIn: 3600, appSlug: appSlug || 'demo' };
}

export function defaultAI(prompt: string): string {
  return (
    `This is a simulated AI answer to: "${prompt || ''}". ` +
    'Embed the app in a real Kiwi class for genuine responses.'
  );
}

export const defaultFixtures: Required<Pick<SimulatorFixtures, 'ops'>> = {
  ops: {
    // A real two-page cursor walk, so paging code terminates offline.
    documentChunks: (params: DocumentChunksParams) => {
      const page2 = params?.cursor === 'sim-page-2';
      if (!page2) {
        return {
          classId: defaultContext.classId,
          documents: [
            {
              documentId: 'sim-doc-1',
              fileName: 'lecture1-recursion.pdf',
              totalChunks: 4,
              chunks: [
                { chunkId: 'sim-c0', index: 0, pageNumber: 1, type: 'CompositeElement', text: 'Recursion is a technique where a function calls itself to solve smaller subproblems.' },
                { chunkId: 'sim-c1', index: 1, pageNumber: 1, type: 'CompositeElement', text: 'A base case stops the recursion; without one the calls never terminate.' },
                { chunkId: 'sim-img', index: 2, pageNumber: 2, type: 'Image', text: 'Figure 1: a diagram of the call stack for factorial(3) unwinding to the base case.' },
              ],
            },
          ],
          nextCursor: 'sim-page-2',
          hasMore: true,
        };
      }
      return {
        classId: defaultContext.classId,
        documents: [
          {
            documentId: 'sim-doc-1',
            fileName: 'lecture1-recursion.pdf',
            totalChunks: 4,
            chunks: [
              { chunkId: 'sim-c3', index: 3, pageNumber: 2, type: 'CompositeElement', text: 'factorial(n) = n * factorial(n-1), with factorial(0) = 1 as the base case.' },
            ],
          },
          {
            documentId: 'sim-doc-2',
            fileName: 'lecture2-sorting.pdf',
            totalChunks: 2,
            chunks: [
              { chunkId: 'sim-d2-c0', index: 0, pageNumber: 1, type: 'CompositeElement', text: 'Merge sort splits the array, sorts each half, then merges them in O(n log n).' },
              { chunkId: 'sim-d2-t0', index: 1, pageNumber: 1, type: 'Table', text: 'Table 1: comparison of merge sort and quicksort in best/average/worst case.' },
            ],
          },
        ],
        nextCursor: null,
        hasMore: false,
      };
    },

    contextualChat: () => ({
      output: JSON.stringify({
        summary:
          'This week you focused on recursion and sorting — base cases and merge sort stood out. (simulated)',
        focusAreas: [
          'Trace a recursion step by step to see how the base case terminates it',
          'Practice merge sort splitting and merging on a small array',
          'Compare merge sort and quicksort in the worst case',
        ],
      }),
      promptId: 'weekly-summary',
      promptName: 'Weekly Study Summary',
      contextIncluded: ['recent_questions', 'weak_concepts', 'relevant_materials'],
      contextOmitted: [],
    }),
  },
};
