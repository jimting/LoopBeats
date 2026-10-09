// @vitest-environment node
import { expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { assembleSession, type ExportManifest } from './session-export';
import { parseSession } from './session-import';

test('same-rate exported archive preserves samples and rejects damaged audio', async () => {
  const manifest: ExportManifest = {
    format: 'LoopBeatsSession',
    version: 1,
    sampleRate: 48000,
    cycleLengthSamples: 3,
    masterGain: 0.5,
    tracks: [
      {
        id: 0,
        mode: 'Loop',
        gain: 0.75,
        muted: true,
        lengthSamples: 3,
        audioPath: 'tracks/0.wav',
      },
      {
        id: 1,
        mode: 'OneShot',
        gain: 1,
        muted: false,
        lengthSamples: 2,
        audioPath: 'tracks/1.wav',
      },
    ],
  };
  const archive = await assembleSession(
    manifest,
    async (id) => new Float32Array(id ? [-1.5, 0.25] : [0.25, 0, -0.5]),
    () => {},
    () => {},
  );
  const bytes = await archive.arrayBuffer();
  const decoded = await parseSession(bytes, 48000);
  expect(decoded.manifest).toEqual(manifest);
  expect(decoded.read(1, 0, 2)).toEqual(new Float32Array([-1.5, 0.25]));
  await expect(parseSession(bytes, 44100)).rejects.toThrow('sample rate');
  const damaged = bytes.slice(0);
  new Uint8Array(damaged)[500] ^= 1;
  await expect(parseSession(damaged, 48000)).rejects.toThrow();
});

function emptyManifest(): ExportManifest {
  return {
    format: 'LoopBeatsSession',
    version: 1,
    sampleRate: 48000,
    cycleLengthSamples: 0,
    masterGain: 1,
    tracks: [0, 1].map((id) => ({
      id,
      mode: 'Loop',
      gain: 1,
      muted: false,
      lengthSamples: 0,
      audioPath: null,
    })),
  };
}
function independentManifestArchive(
  source: ExportManifest,
  jsonSize = 0,
): ArrayBuffer {
  // Python creates the ZIP independently. Explicit UTF-8 flags match the accepted format.
  const file = execFileSync('python', [
    '-c',
    `
import sys,io,zipfile,struct
payload=sys.argv[1].encode('utf-8'); size=int(sys.argv[2])
if size: payload+=b' '*(size-len(payload))
out=io.BytesIO()
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_STORED) as z: z.writestr('session.json',payload)
b=bytearray(out.getvalue()); c=struct.unpack_from('<I',b,len(b)-6)[0]
struct.pack_into('<H',b,6,0x800); struct.pack_into('<H',b,c+8,0x800)
sys.stdout.buffer.write(b)
`,
    JSON.stringify(source),
    String(jsonSize),
  ]);
  return file.buffer.slice(
    file.byteOffset,
    file.byteOffset + file.length,
  ) as ArrayBuffer;
}

test.each([7999, 192001, 48000.5])(
  'rejects unsupported source rate %s in a valid ZIP',
  async (rate) => {
    const source = emptyManifest();
    source.sampleRate = rate;
    await expect(
      parseSession(independentManifestArchive(source), 48000),
    ).rejects.toThrow('Invalid');
  },
);

test('accepts exactly 64 KiB JSON and rejects one byte more in independently created ZIPs', async () => {
  const source = emptyManifest();
  const accepted = await parseSession(
    independentManifestArchive(source, 65536),
    48000,
  );
  expect(accepted.manifest).toEqual(source);
  await expect(
    parseSession(independentManifestArchive(source, 65537), 48000),
  ).rejects.toThrow('Invalid');
});
async function encode(manifest: ExportManifest) {
  return (
    await assembleSession(
      manifest,
      async (_, __, frames) => new Float32Array(frames).fill(0.25),
      () => {},
      () => {},
    )
  ).arrayBuffer();
}

test.each([8000, 192000])(
  'accepts empty tracks and a retained cycle at rate %i',
  async (rate) => {
    const source = emptyManifest();
    source.sampleRate = rate;
    source.cycleLengthSamples = rate * 60;
    expect((await parseSession(await encode(source), rate)).manifest).toEqual(
      source,
    );
  },
);

test.each([
  'version',
  'extra',
  'gain',
  'mute',
  'identity',
  'mode',
  'path',
  'cycle',
] as const)(
  'rejects invalid %s metadata even with valid CRCs',
  async (fault) => {
    const source = emptyManifest();
    switch (fault) {
      case 'version':
        source.version = 2 as 1;
        break;
      case 'extra':
        Object.assign(source, { deviceId: 'forbidden' });
        break;
      case 'gain':
        source.masterGain = 2;
        break;
      case 'mute':
        source.tracks[0].muted = 1 as unknown as boolean;
        break;
      case 'identity':
        source.tracks[1].id = 0;
        break;
      case 'mode':
        source.tracks[0].mode = 'Unsupported' as 'Loop';
        break;
      case 'path':
        source.tracks[0].audioPath = '../outside.wav';
        break;
      case 'cycle':
        source.tracks[0].lengthSamples = 3;
        source.tracks[0].audioPath = 'tracks/0.wav';
        break;
    }
    await expect(parseSession(await encode(source), 48000)).rejects.toThrow();
  },
);

test.each([
  'compression',
  'encryption',
  'offset',
  'truncation',
  'oversized',
] as const)('rejects %s ZIP before restoring', async (fault) => {
  let bytes = await encode(emptyManifest());
  const v = new DataView(bytes);
  const directory = v.getUint32(bytes.byteLength - 6, true);
  switch (fault) {
    case 'compression':
      v.setUint16(8, 8, true);
      v.setUint16(directory + 10, 8, true);
      break;
    case 'encryption':
      v.setUint16(6, 0x801, true);
      v.setUint16(directory + 8, 0x801, true);
      break;
    case 'offset':
      v.setUint32(directory + 42, 1, true);
      break;
    case 'truncation':
      bytes = bytes.slice(0, -1);
      break;
    case 'oversized':
      bytes = new ArrayBuffer(96 * 1024 * 1024 + 1);
      break;
  }
  await expect(parseSession(bytes, 48000)).rejects.toThrow();
});

test.each(['rate', 'channels', 'fact', 'length', 'nonfinite'] as const)(
  'rejects invalid WAV %s with independently repaired CRCs',
  async (fault) => {
    const source = emptyManifest();
    source.cycleLengthSamples = 3;
    source.tracks[0].lengthSamples = 3;
    source.tracks[0].audioPath = 'tracks/0.wav';
    const input = await encode(source);
    const output = execFileSync(
      'python',
      [
        '-c',
        `
import sys,struct,zlib
b=bytearray(sys.stdin.buffer.read()); c=struct.unpack_from('<I',b,len(b)-6)[0]
while b[c:c+4]==b'PK\\x01\\x02':
 n=struct.unpack_from('<H',b,c+28)[0]
 if b[c+46:c+46+n]==b'tracks/0.wav':
  l=struct.unpack_from('<I',b,c+42)[0]; size=struct.unpack_from('<I',b,c+24)[0]; p=l+30+n
  f=sys.argv[1]
  if f=='rate': struct.pack_into('<I',b,p+24,44100)
  if f=='channels': struct.pack_into('<H',b,p+22,2)
  if f=='fact': struct.pack_into('<I',b,p+44,2)
  if f=='length': struct.pack_into('<I',b,p+52,8)
  if f=='nonfinite': struct.pack_into('<f',b,p+56,float('nan'))
  crc=zlib.crc32(b[p:p+size]); struct.pack_into('<I',b,l+14,crc); struct.pack_into('<I',b,c+16,crc)
 c+=46+n
sys.stdout.buffer.write(b)
`,
        fault,
      ],
      { input: Buffer.from(input) },
    );
    await expect(
      parseSession(
        output.buffer.slice(
          output.byteOffset,
          output.byteOffset + output.byteLength,
        ) as ArrayBuffer,
        48000,
      ),
    ).rejects.toThrow();
  },
);

test('validation yields to cancellation without returning staged data', async () => {
  const bytes = await encode(emptyManifest());
  let canceled = false;
  const parsed = parseSession(bytes, 48000, () => {
    if (canceled) throw new Error('Canceled');
  });
  canceled = true;
  await expect(parsed).rejects.toThrow('Canceled');
});
