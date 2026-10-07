// Offline photo → anime: runs the AnimeGANv2 "face paint 512 v2" model on this computer
// (onnxruntime WebAssembly build, CPU). No network, no API key. Started as a Node worker thread by
// the main process; receives a 512×512 RGB image as a Float32 CHW tensor in [-1, 1] and returns
// the anime version in the same format.
import { parentPort } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
import { cpus } from 'node:os';

const here = new URL('./', import.meta.url);
const ort = await import(new URL('ort/ort.node.min.mjs', here).href);
ort.env.wasm.wasmPaths = new URL('ort/', here).href;
ort.env.wasm.numThreads = Math.max(1, Math.min(4, cpus().length - 1));

let session = null;
async function getSession() {
  session ??= await ort.InferenceSession.create(await readFile(new URL('face_paint_512_v2.onnx', here)), {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  });
  return session;
}

parentPort.on('message', async ({ id, pixels }) => {
  try {
    const s = await getSession();
    const out = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', pixels, [1, 3, 512, 512]) });
    const data = out[s.outputNames[0]].data;
    parentPort.postMessage({ id, pixels: data }, [data.buffer]);
  } catch (e) {
    parentPort.postMessage({ id, error: e instanceof Error ? e.message : String(e) });
  }
});
