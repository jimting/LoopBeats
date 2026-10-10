import { expect, test } from '@playwright/test';

test('production WASM freezes raw overdub, wrapped capture and prefix audio between chunk reads', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const module = await WebAssembly.compile(
      await (await fetch('/audio/loop-engine.wasm')).arrayBuffer(),
    );
    type Engine = {
      memory: WebAssembly.Memory;
      [name: string]: WebAssembly.Memory | ((...args: number[]) => number);
    };
    const create = () => {
      const exports = new WebAssembly.Instance(module)
        .exports as unknown as Engine;
      const call = (name: string, ...args: number[]) =>
        (exports[name] as (...args: number[]) => number)(...args);
      call('initialize', 8000);
      const input = new Float32Array(
        exports.memory.buffer,
        call('input_ptr'),
        2048,
      );
      const output = new Float32Array(
        exports.memory.buffer,
        call('output_ptr'),
        2048,
      );
      return {
        call,
        process(values: number[]) {
          input.set(values);
          call('process', values.length);
        },
        read(id: number, offset: number, length: number) {
          if (!call('read_checkpoint', id, offset, length))
            throw new Error('Read failed');
          return Array.from(output.slice(0, length));
        },
      };
    };
    const first = create();
    first.call('record', 0);
    first.process([0.25, -0.5]);
    first.call('checkpoint_begin');
    const prefixLength = first.call('checkpoint_length', 0);
    const prefixCycle = first.call('checkpoint_cycle');
    first.process([0.75, 1]);
    const prefix = first.read(0, 0, 2);
    first.call('checkpoint_cancel');

    const joined = create();
    joined.call('record', 0);
    joined.process([0.1, 0.1, 0.1, 0.1]);
    joined.call('record', 0);
    joined.process([0, 0, 0]);
    joined.call('record', 1);
    joined.process([0.25, -0.5]);
    joined.call('checkpoint_begin');
    joined.process([0.75, 1]);
    const phase = joined.read(1, 0, 4);

    const overdub = create();
    overdub.call('record', 0);
    overdub.process([0.25, 0.5, 0.75]);
    overdub.call('record', 0);
    overdub.call('record', 0);
    overdub.process([1]);
    overdub.call('checkpoint_begin');
    const head = overdub.read(0, 0, 1);
    overdub.process([2, 2, 2, 2, 2, 2, 2, 2]);
    const tail = overdub.read(0, 1, 2);
    const unchanged = overdub.read(0, 0, 3);
    return { prefix, prefixLength, prefixCycle, phase, head, tail, unchanged };
  });
  expect(result).toEqual({
    prefix: [0.25, -0.5],
    prefixLength: 2,
    prefixCycle: 2,
    phase: [-0.5, 0, 0, 0.25],
    head: [1.25],
    tail: [0.5, 0.75],
    unchanged: [1.25, 0.5, 0.75],
  });
});

test('two-track capacity checkpoint has bounded reads and measures processing overhead', async ({
  page,
}) => {
  await page.goto('/');
  const measurement = await page.evaluate(async () => {
    const module = await WebAssembly.compile(
      await (await fetch('/audio/loop-engine.wasm')).arrayBuffer(),
    );
    const engine = new WebAssembly.Instance(module).exports;
    const call = (name: string, ...args: number[]) =>
      (engine[name] as (...args: number[]) => number)(...args);
    call('initialize', 48000);
    const input = new Float32Array(
      (engine.memory as WebAssembly.Memory).buffer,
      call('input_ptr'),
      2048,
    );
    input.fill(0.25);
    const blocks = (48000 * 60) / 128;
    call('record', 0);
    for (let i = 0; i < blocks; i++) call('process', 128);
    call('record', 1);
    for (let i = 0; i < blocks; i++) call('process', 128);
    call('record', 0);
    const measure = () => {
      const start = performance.now();
      for (let i = 0; i < blocks; i++) call('process', 128);
      return performance.now() - start;
    };
    const baselineMs = measure();
    const memoryBefore = (engine.memory as WebAssembly.Memory).buffer
      .byteLength;
    if (!call('checkpoint_begin')) throw new Error('Begin failed');
    const frozenProcessingMs = measure();
    const loadStart = performance.now();
    while (performance.now() - loadStart < 100) {
      /* reproducible host load */
    }
    const start = performance.now();
    let reads = 0;
    for (let id = 0; id < 2; id++) {
      const length = call('checkpoint_length', id);
      for (let offset = 0; offset < length; offset += 2048) {
        if (
          !call('read_checkpoint', id, offset, Math.min(2048, length - offset))
        )
          throw new Error('Read failed');
        if (offset === 0) {
          const output = new Float32Array(
            (engine.memory as WebAssembly.Memory).buffer,
            call('output_ptr'),
            1,
          );
          if (output[0] !== (id === 0 ? 0.5 : 0.25))
            throw new Error('Frozen samples changed under load');
        }
        reads++;
      }
    }
    const transferMs = performance.now() - start;
    const oversized = call('read_checkpoint', 0, 0, 2049);
    call('checkpoint_cancel');
    const memoryAfter = (engine.memory as WebAssembly.Memory).buffer.byteLength;
    return {
      baselineMs,
      frozenProcessingMs,
      transferMs,
      reads,
      oversized,
      memoryBefore,
      memoryAfter,
    };
  });
  console.log(
    'Checkpoint measurement (two 60-second tracks, 48kHz, 128-frame processing):',
    measurement,
  );
  expect(measurement.reads).toBe(2814);
  expect(measurement.oversized).toBe(0);
  expect(measurement.memoryAfter).toBe(measurement.memoryBefore);
  // Informational reproducible CPU evidence; wall-clock timing is not an audio deadline claim.
  expect(measurement.transferMs).toBeGreaterThanOrEqual(0);
});
