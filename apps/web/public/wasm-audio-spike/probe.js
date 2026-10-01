export async function createWasmNode(context) {
  const response = await fetch(new URL('./gain.wasm', import.meta.url));
  if (!response.ok)
    throw new Error(
      `WASM download failed (${response.status}); run npm run spike:wasm:build.`,
    );
  const module = await WebAssembly.compile(await response.arrayBuffer());
  await context.audioWorklet.addModule(new URL('./gain.js', import.meta.url));
  return new AudioWorkletNode(context, 'wasm-gain-spike', {
    channelCount: 1,
    channelCountMode: 'explicit',
    outputChannelCount: [2],
    processorOptions: { module, gain: 0.5 },
  });
}

// End-to-end rendering throughput, NOT per-callback CPU time or physical latency.
export async function runOfflineProbe(seconds = 30) {
  const context = new OfflineAudioContext(2, seconds * 48000, 48000);
  const node = await createWasmNode(context);
  const source = context.createConstantSource();
  source.offset.value = 0.5;
  source.connect(node).connect(context.destination);
  source.start();
  const started = performance.now();
  const rendered = await context.startRendering();
  const wallMilliseconds = performance.now() - started;
  const snapshot = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Worklet diagnostics timed out')),
      5000,
    );
    node.port.onmessage = (event) => {
      clearTimeout(timeout);
      resolve(event.data);
    };
    node.port.postMessage('snapshot');
  });
  const samples = rendered.getChannelData(0);
  return {
    seconds,
    wallMilliseconds,
    wallToAudioRatio: wallMilliseconds / (seconds * 1000),
    samples: [
      samples[0],
      samples[127],
      samples[128],
      samples[255],
      samples.at(-1),
    ],
    snapshot,
  };
}
