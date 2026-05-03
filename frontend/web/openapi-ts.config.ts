import { defineConfig } from '@hey-api/openapi-ts';

/*
 * Codegen pipeline: backend swagger.yaml → TypeScript types.
 *
 * Output goes to src/api/generated/ (subfolder!) so codegen never wipes
 * hand-written src/api/client.ts and feature wrappers. openapi-ts cleans
 * its output dir on every run by design — keep it isolated.
 *
 * NOTE: только @hey-api/typescript плагин — генерируем types.gen.ts и
 * больше ничего. Готовый @hey-api SDK + client подключим follow-up'ом, когда
 * выровним версии @hey-api/openapi-ts (0.64) и @hey-api/client-fetch (0.7).
 *
 * Output is gitignored — агент должен прогонять codegen локально, в CI
 * он запускается перед typecheck.
 */
export default defineConfig({
  input: '../../backend/project-service/swagger.yaml',
  output: {
    path: 'src/api/generated',
    format: 'prettier',
    lint: false,
  },
  plugins: [
    {
      name: '@hey-api/typescript',
      // Don't emit TS `enum`s — strings on the wire don't need a wrapper,
      // and string-literal unions let feature code write `status: 'Черновик'`
      // directly instead of `ProjectStatus.ЧЕРНОВИК`.
      enums: false,
    },
  ],
});
