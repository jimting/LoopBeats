//! Browser-independent sample-authoritative recording and playback.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum TrackState {
    Empty,
    Recording,
    Playing,
}
#[derive(Clone, Copy, Debug)]
pub struct TrackSnapshot {
    pub state: TrackState,
    pub length_samples: usize,
    pub position_samples: usize,
}
pub struct LoopEngine {
    monitoring: bool,
    recording: Box<[f32]>,
    state: TrackState,
    length: usize,
    position: usize,
}
impl Default for LoopEngine {
    fn default() -> Self {
        Self::new()
    }
}
impl LoopEngine {
    pub fn new() -> Self {
        Self::with_capacity(48_000 * 60)
    }
    /// Allocate and zero capture storage during initialization, never processing.
    pub fn with_capacity(samples: usize) -> Self {
        assert!(samples > 0);
        Self {
            monitoring: false,
            recording: vec![0.0; samples].into_boxed_slice(),
            state: TrackState::Empty,
            length: 0,
            position: 0,
        }
    }
    pub fn set_monitoring(&mut self, enabled: bool) {
        self.monitoring = enabled;
    }
    pub fn monitoring(&self) -> bool {
        self.monitoring
    }
    /// Applied between processing blocks; no UI timestamp controls audio timing.
    pub fn record(&mut self) {
        match self.state {
            TrackState::Empty => self.state = TrackState::Recording,
            TrackState::Recording => self.finish_recording(),
            TrackState::Playing => {} // Overdubbing belongs to #11.
        }
    }
    fn finish_recording(&mut self) {
        self.position = 0;
        self.state = if self.length == 0 {
            TrackState::Empty
        } else {
            TrackState::Playing
        };
    }
    pub fn snapshot(&self) -> TrackSnapshot {
        TrackSnapshot {
            state: self.state,
            length_samples: self.length,
            position_samples: self.position,
        }
    }
    pub fn process(&mut self, input: &[f32], output: &mut [f32]) {
        for (index, destination) in output.iter_mut().enumerate() {
            let source = input.get(index).copied().unwrap_or(0.0);
            let mut sample = if self.monitoring { source } else { 0.0 };
            match self.state {
                TrackState::Empty => {}
                TrackState::Recording => {
                    self.recording[self.length] = source;
                    self.length += 1;
                    if self.length == self.recording.len() {
                        self.finish_recording();
                    }
                }
                TrackState::Playing => {
                    sample += self.recording[self.position];
                    self.position += 1;
                    if self.position == self.length {
                        self.position = 0;
                    }
                }
            }
            *destination = sample.clamp(-1.0, 1.0);
        }
    }
}

#[cfg(target_arch = "wasm32")]
mod wasm {
    use super::LoopEngine;
    const CAPACITY: usize = 2048;
    static mut INPUT: [f32; CAPACITY] = [0.0; CAPACITY];
    static mut OUTPUT: [f32; CAPACITY] = [0.0; CAPACITY];
    static mut ENGINE: Option<LoopEngine> = None;
    #[no_mangle]
    pub extern "C" fn initialize(sample_rate: usize) -> u32 {
        if !(8_000..=192_000).contains(&sample_rate) {
            return 0;
        }
        // SAFETY: called once by the serialized host before processing/views.
        unsafe {
            *core::ptr::addr_of_mut!(ENGINE) = Some(LoopEngine::with_capacity(sample_rate * 60));
        }
        1
    }
    #[no_mangle]
    pub extern "C" fn record() {
        // SAFETY: initialized instance owned by one serialized worklet.
        unsafe {
            (*core::ptr::addr_of_mut!(ENGINE))
                .as_mut()
                .unwrap()
                .record();
        }
    }
    #[no_mangle]
    pub extern "C" fn track_state() -> u32 {
        // SAFETY: initialized instance owned by one serialized worklet.
        unsafe {
            (*core::ptr::addr_of!(ENGINE))
                .as_ref()
                .unwrap()
                .snapshot()
                .state as u32
        }
    }
    #[no_mangle]
    pub extern "C" fn loop_length() -> usize {
        // SAFETY: initialized instance owned by one serialized worklet.
        unsafe {
            (*core::ptr::addr_of!(ENGINE))
                .as_ref()
                .unwrap()
                .snapshot()
                .length_samples
        }
    }
    #[no_mangle]
    pub extern "C" fn loop_position() -> usize {
        // SAFETY: initialized instance owned by one serialized worklet.
        unsafe {
            (*core::ptr::addr_of!(ENGINE))
                .as_ref()
                .unwrap()
                .snapshot()
                .position_samples
        }
    }
    #[no_mangle]
    pub extern "C" fn input_ptr() -> *mut f32 {
        core::ptr::addr_of_mut!(INPUT).cast()
    }
    #[no_mangle]
    pub extern "C" fn output_ptr() -> *mut f32 {
        core::ptr::addr_of_mut!(OUTPUT).cast()
    }
    #[no_mangle]
    pub extern "C" fn capacity() -> usize {
        CAPACITY
    }
    #[no_mangle]
    pub extern "C" fn set_monitoring(enabled: u32) {
        // SAFETY: one instance belongs to one worklet; calls are serialized.
        unsafe {
            (*core::ptr::addr_of_mut!(ENGINE))
                .as_mut()
                .unwrap()
                .set_monitoring(enabled != 0);
        }
    }
    #[no_mangle]
    pub extern "C" fn monitoring() -> u32 {
        // SAFETY: same single-worklet ownership as processing/commands.
        unsafe {
            (*core::ptr::addr_of!(ENGINE))
                .as_ref()
                .unwrap()
                .monitoring() as u32
        }
    }
    #[no_mangle]
    pub extern "C" fn process(frames: usize) -> usize {
        if frames > CAPACITY {
            return 0;
        }
        // SAFETY: disjoint static buffers; bounded length; one serialized host
        // owner which must not access buffers during processing.
        unsafe {
            (*core::ptr::addr_of_mut!(ENGINE))
                .as_mut()
                .unwrap()
                .process(
                    core::slice::from_raw_parts(input_ptr(), frames),
                    core::slice::from_raw_parts_mut(output_ptr(), frames),
                );
        }
        frames
    }
}
