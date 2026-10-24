import { defineConfig, bindings } from 'cf/config';

export default defineConfig({
  accountId: 'ce13960cb78935713d21d554d8d70104',
  worker: {
    name: 'makepace-downloads',
    entrypoint: './worker.mjs',
    compatibilityDate: '2026-10-24',
    workersDev: true,
    previewUrls: false,
    env: { INSTALLERS: bindings.r2({ name: 'makepace-installers' }) },
    observability: {
      enabled: true,
      headSamplingRate: 0.01,
      traces: { enabled: true, headSamplingRate: 0.01 },
    },
  },
});
