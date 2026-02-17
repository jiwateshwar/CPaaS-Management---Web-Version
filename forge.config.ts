import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import fs from 'fs';
import path from 'path';

/** Copy a native node module (and its deps) into the packaged app */
function copyNativeModule(appDir: string, moduleName: string) {
  const src = path.join(__dirname, 'node_modules', moduleName);
  const dest = path.join(appDir, 'node_modules', moduleName);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/node_modules/{better-sqlite3,bindings,file-uri-to-path}/**/*',
    },
    name: 'CPaaS Management',
    executableName: 'cpaas-management',
    appBundleId: 'com.cpaas.management',
    appVersion: '1.0.0',
  },
  rebuildConfig: {},
  hooks: {
    packageAfterCopy: async (_config, appDir) => {
      // Copy native modules that are externalized from Vite bundle
      copyNativeModule(appDir, 'better-sqlite3');
      copyNativeModule(appDir, 'bindings');
      copyNativeModule(appDir, 'file-uri-to-path');
    },
  },
  makers: [
    new MakerSquirrel({
      name: 'cpaas-management',
      setupExe: 'CPaaS-Management-Setup.exe',
      description: 'Financial ledger and margin tracking for CPaaS operations',
    }),
    new MakerZIP({}, ['win32']),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/main/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

export default config;
