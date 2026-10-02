//! Browser-independent sample-authoritative recording and playback.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum TrackState {
    Empty,
    Recording,
    Playing,
    Stopped,
}
#[derive(Clone, Copy, Debug)]
pub struct EngineSnapshot {
    pub state: TrackState,
    pub length_samples: usize,
    pub position_samples: usize,
    pub transport_running: bool,
    pub transport_position_samples: u64,
    pub cycle_length_samples: usize,
    pub capacity_samples: usize,
    pub can_record: bool,
    pub can_play: bool,
    pub can_stop: bool,
}
#[derive(Default)]
struct Transport {
    running: bool,
    position: u64,
    cycle_length: usize,
}
pub struct LoopEngine {
    monitoring: bool,
    recording: Box<[f32]>,
    state: TrackState,
    length: usize,
    transport: Transport,
}
impl Default for LoopEngine {
    fn default() -> Self {
        Self::new()
    }
}
impl LoopEngine {
    pub fn new() -> Self {
        Self::with_sample_rate(48_000)
    }
    pub fn with_sample_rate(sample_rate: u32) -> Self {
        assert!((8_000..=192_000).contains(&sample_rate));
        Self::with_capacity(sample_rate as usize * 60)
    }
    /// Allocate and zero capture storage during initialization, never processing.
    pub fn with_capacity(samples: usize) -> Self {
        assert!(samples > 0);
        Self {
            monitoring: false,
            recording: vec![0.0; samples].into_boxed_slice(),
            state: TrackState::Empty,
            length: 0,
            transport: Transport::default(),
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
            TrackState::Empty if self.snapshot().can_record => self.state = TrackState::Recording,
            TrackState::Empty => {}
            TrackState::Recording => self.finish_recording(true),
            TrackState::Playing | TrackState::Stopped => {} // Overdubbing belongs to #11.
        }
    }
    fn finish_recording(&mut self, play: bool) {
        if self.length == 0 {
            self.state = TrackState::Empty;
            return;
        }
        self.transport.cycle_length = self.length;
        self.transport.position = 0;
        self.transport.running = play;
        self.state = if play {
            TrackState::Playing
        } else {
            TrackState::Stopped
        };
    }
    pub fn stop_track(&mut self) {
        match self.state {
            TrackState::Recording => self.finish_recording(false),
            TrackState::Playing => self.state = TrackState::Stopped,
            TrackState::Empty | TrackState::Stopped => {}
        }
    }
    pub fn play(&mut self) {
        if self.state != TrackState::Stopped {
            return;
        }
        if !self.transport.running {
            self.transport.position = 0;
            self.transport.running = true;
        }
        self.state = TrackState::Playing;
    }
    pub fn stop_transport(&mut self) {
        match self.state {
            TrackState::Recording => {
                self.state = TrackState::Empty;
                self.length = 0;
            }
            TrackState::Playing => self.state = TrackState::Stopped,
            TrackState::Empty | TrackState::Stopped => {}
        }
        self.transport.running = false;
        self.transport.position = 0;
    }
    fn cycle_position(&self) -> usize {
        if self.transport.cycle_length == 0 {
            0
        } else {
            (self.transport.position % self.transport.cycle_length as u64) as usize
        }
    }
    pub fn snapshot(&self) -> EngineSnapshot {
        EngineSnapshot {
            state: self.state,
            length_samples: self.length,
            position_samples: self.cycle_position(),
            transport_running: self.transport.running,
            transport_position_samples: self.transport.position,
            cycle_length_samples: self.transport.cycle_length,
            capacity_samples: self.recording.len(),
            can_record: self.state == TrackState::Recording
                || (self.state == TrackState::Empty
                    && (self.transport.cycle_length == 0 || self.transport.running)),
            can_play: self.state == TrackState::Stopped,
            can_stop: self.state == TrackState::Recording || self.state == TrackState::Playing,
        }
    }
    pub fn process(&mut self, input: &[f32], output: &mut [f32]) {
        for (index, destination) in output.iter_mut().enumerate() {
            let advance = self.transport.running;
            let source = input.get(index).copied().unwrap_or(0.0);
            let mut sample = if self.monitoring { source } else { 0.0 };
            match self.state {
                TrackState::Empty | TrackState::Stopped => {}
                TrackState::Recording => {
                    self.recording[self.length] = source;
                    self.length += 1;
                    if self.length == self.recording.len() {
                        self.finish_recording(true);
                    }
                }
                TrackState::Playing => {
                    sample += self.recording[self.cycle_position()];
                }
            }
            *destination = sample.clamp(-1.0, 1.0);
            // Capture completion establishes position zero for the next sample.
            if advance {
                self.transport.position += 1;
            }
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
            *core::ptr::addr_of_mut!(ENGINE) =
                Some(LoopEngine::with_sample_rate(sample_rate as u32));
        }
        1
    }
    // One initialized WASM instance is owned by one serialized worklet host.
    fn with_engine<T>(operation: impl FnOnce(&mut LoopEngine) -> T) -> T {
        // SAFETY: exports do not overlap and no engine reference escapes.
        unsafe { operation((*core::ptr::addr_of_mut!(ENGINE)).as_mut().unwrap()) }
    }
    #[no_mangle]
    pub extern "C" fn record() {
        with_engine(|engine| engine.record())
    }
    #[no_mangle]
    pub extern "C" fn play() {
        with_engine(|engine| engine.play())
    }
    #[no_mangle]
    pub extern "C" fn stop_track() {
        with_engine(|engine| engine.stop_track())
    }
    #[no_mangle]
    pub extern "C" fn stop_transport() {
        with_engine(|engine| engine.stop_transport())
    }
    #[no_mangle]
    pub extern "C" fn track_state() -> u32 {
        with_engine(|engine| engine.snapshot().state as u32)
    }
    #[no_mangle]
    pub extern "C" fn loop_length() -> usize {
        with_engine(|engine| engine.snapshot().length_samples)
    }
    #[no_mangle]
    pub extern "C" fn loop_position() -> usize {
        with_engine(|engine| engine.snapshot().position_samples)
    }
    #[no_mangle]
    pub extern "C" fn recording_capacity() -> usize {
        with_engine(|engine| engine.snapshot().capacity_samples)
    }
    #[no_mangle]
    pub extern "C" fn transport_running() -> u32 {
        with_engine(|engine| engine.snapshot().transport_running as u32)
    }
    #[no_mangle]
    pub extern "C" fn transport_position() -> f64 {
        with_engine(|engine| engine.snapshot().transport_position_samples as f64)
    }
    #[no_mangle]
    pub extern "C" fn cycle_length() -> usize {
        with_engine(|engine| engine.snapshot().cycle_length_samples)
    }
    #[no_mangle]
    pub extern "C" fn can_record() -> u32 {
        with_engine(|engine| engine.snapshot().can_record as u32)
    }
    #[no_mangle]
    pub extern "C" fn can_play() -> u32 {
        with_engine(|engine| engine.snapshot().can_play as u32)
    }
    #[no_mangle]
    pub extern "C" fn can_stop() -> u32 {
        with_engine(|engine| engine.snapshot().can_stop as u32)
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
        with_engine(|engine| engine.set_monitoring(enabled != 0));
    }
    #[no_mangle]
    pub extern "C" fn monitoring() -> u32 {
        with_engine(|engine| engine.monitoring() as u32)
    }
    #[no_mangle]
    pub extern "C" fn process(frames: usize) -> usize {
        if frames > CAPACITY {
            return 0;
        }
        // SAFETY: disjoint static buffers; bounded length; one serialized host
        // owner which must not access buffers during processing.
        with_engine(|engine| unsafe {
            engine.process(
                core::slice::from_raw_parts(input_ptr(), frames),
                core::slice::from_raw_parts_mut(output_ptr(), frames),
            );
        });
        frames
    }
}
