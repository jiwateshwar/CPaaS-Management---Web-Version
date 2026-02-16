import { utilityProcess, UtilityProcess, MessagePortMain } from 'electron';
import path from 'node:path';

export interface WorkerMessage {
  type: string;
  payload: unknown;
}

/**
 * Spawns an Electron utilityProcess for background work.
 * The worker script must call `process.parentPort.on('message', ...)` to receive messages
 * and `process.parentPort.postMessage(...)` to send results back.
 *
 * NOTE: In Electron Forge + Vite, utilityProcess requires a compiled JS entry.
 * For now, workers run as inline functions in the main process via this wrapper.
 * When the app is packaged, these can be separate compiled scripts.
 */
export function spawnWorker(
  scriptName: string,
  onMessage: (msg: WorkerMessage) => void,
  onExit?: (code: number) => void,
): { child: UtilityProcess; send: (msg: WorkerMessage) => void } {
  // In development with Vite, utilityProcess scripts need to be pre-built.
  // We use __dirname which points to .vite/build/ in dev.
  const scriptPath = path.join(__dirname, `${scriptName}.js`);

  const child = utilityProcess.fork(scriptPath);

  child.on('message', (msg: WorkerMessage) => {
    onMessage(msg);
  });

  if (onExit) {
    child.on('exit', onExit);
  }

  const send = (msg: WorkerMessage) => {
    child.postMessage(msg);
  };

  return { child, send };
}

/**
 * Alternative: run heavy work in main process but yield to event loop periodically.
 * This prevents complete UI freeze without requiring a separate process.
 * Use this as a lightweight alternative to utilityProcess.
 */
export function runAsync<T>(
  work: () => T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    // Use setImmediate to yield to the event loop once before starting
    setImmediate(() => {
      try {
        resolve(work());
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Run work in batches, yielding to the event loop between batches.
 * Prevents UI freezing for large iteration-based tasks.
 */
export async function runBatched<T, R>(
  items: T[],
  batchSize: number,
  processBatch: (batch: T[], startIndex: number) => R[],
  onProgress?: (processed: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Yield to event loop between batches
    await new Promise<void>((resolve) => setImmediate(resolve));

    const batchResults = processBatch(batch, i);
    results.push(...batchResults);

    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length);
    }
  }

  return results;
}
