// Private storage: lazy validity keeps uncaptured/discarded samples silent.
// One 64-sample validity word is reset on its first write in a new capture.
#[derive(Clone, Copy, Default)]
struct ValidityWord {
    generation: u64,
    bits: u64,
}
pub(super) struct LoopBuffer {
    samples: Box<[f32]>,
    validity: Box<[ValidityWord]>,
    generation: u64,
}
impl LoopBuffer {
    pub fn new(capacity: usize) -> Self {
        Self {
            samples: vec![0.0; capacity].into_boxed_slice(),
            validity: vec![ValidityWord::default(); capacity.div_ceil(64)].into_boxed_slice(),
            generation: 0,
        }
    }
    pub fn capacity(&self) -> usize {
        self.samples.len()
    }
    pub fn can_begin_capture(&self) -> bool {
        self.generation < u64::MAX
    }
    pub fn begin_capture(&mut self) {
        self.generation += 1;
    }
    pub fn read(&self, position: usize) -> f32 {
        if self.is_written(position) {
            self.samples[position]
        } else {
            0.0
        }
    }
    pub fn is_written(&self, position: usize) -> bool {
        let word = self.validity[position / 64];
        word.generation == self.generation && word.bits & (1 << (position % 64)) != 0
    }
    pub fn write(&mut self, position: usize, sample: f32) {
        let word = &mut self.validity[position / 64];
        if word.generation != self.generation {
            word.generation = self.generation;
            word.bits = 0;
        }
        word.bits |= 1 << (position % 64);
        self.samples[position] = sample;
    }
}
