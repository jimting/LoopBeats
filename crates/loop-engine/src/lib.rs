//! Browser-independent sample-authoritative recording and playback.
mod loop_buffer;
use loop_buffer::LoopBuffer;
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum TrackState {
    Empty,
    Recording,
    Playing,
    Stopped,
    Overdubbing,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum PlaybackMode {
    Loop,
    OneShot,
}
#[derive(Clone, Copy, Debug)]
pub struct TrackSnapshot {
    pub mode: PlaybackMode,
    pub can_set_mode: bool,
    pub state: TrackState,
    pub length_samples: usize,
    pub captured_samples: usize,
    pub position_samples: usize,
    pub capacity_samples: usize,
    pub capture_limit_samples: usize,
    pub can_record: bool,
    pub can_play: bool,
    pub can_stop: bool,
}
#[derive(Clone, Copy, Debug)]
pub struct EngineSnapshot {
    pub tracks: [TrackSnapshot; 2],
    pub transport_running: bool,
    pub transport_position_samples: u64,
    pub cycle_length_samples: usize,
}
#[derive(Default)]
struct Transport {
    running: bool,
    position: u64,
    cycle_length: usize,
}
struct Track {
    mode: PlaybackMode,
    one_shot_position: usize,
    recording: LoopBuffer,
    state: TrackState,
    length: usize,
    captured: usize,
}
pub struct LoopEngine {
    monitoring: bool,
    tracks: [Track; 2],
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
    /// Allocate capture storage during initialization, never processing.
    pub fn with_capacity(samples: usize) -> Self {
        assert!(samples > 0);
        Self {
            monitoring: false,
            tracks: std::array::from_fn(|_| Track {
                mode: PlaybackMode::Loop,
                one_shot_position: 0,
                recording: LoopBuffer::new(samples),
                state: TrackState::Empty,
                length: 0,
                captured: 0,
            }),
            transport: Transport::default(),
        }
    }
    pub fn set_monitoring(&mut self, enabled: bool) {
        self.monitoring = enabled;
    }
    pub fn monitoring(&self) -> bool {
        self.monitoring
    }
    /// Select an empty track's capture mode. Retained conversions belong to #13.
    pub fn set_mode(&mut self, track_id: usize, mode: PlaybackMode) {
        if let Some(track) = self.tracks.get_mut(track_id) {
            if track.state == TrackState::Empty {
                track.mode = mode;
            }
        }
    }
    /// Invalid track indices and unavailable commands are ignored by the engine.
    pub fn record(&mut self, track_id: usize) {
        if track_id >= self.tracks.len() || !self.snapshot().tracks[track_id].can_record {
            return;
        }
        match self.tracks[track_id].state {
            TrackState::Recording => self.finish_recording(track_id, true),
            TrackState::Overdubbing => self.tracks[track_id].state = TrackState::Playing,
            TrackState::Playing | TrackState::Stopped => {
                self.tracks[track_id].state = TrackState::Overdubbing
            }
            TrackState::Empty => {
                let track = &mut self.tracks[track_id];
                track.recording.begin_capture();
                track.state = TrackState::Recording;
                track.length = if track.mode == PlaybackMode::Loop {
                    self.transport.cycle_length
                } else {
                    0
                };
                track.one_shot_position = 0;
                track.captured = 0;
            }
        }
    }

    fn finish_recording(&mut self, track_id: usize, play: bool) {
        let track = &mut self.tracks[track_id];
        if track.captured == 0 {
            track.state = TrackState::Empty;
            track.length = 0;
            return;
        }
        if track.mode == PlaybackMode::OneShot {
            track.length = track.captured;
            track.one_shot_position = 0;
        }
        if track.mode == PlaybackMode::Loop && self.transport.cycle_length == 0 {
            track.length = track.captured;
            self.transport.cycle_length = track.length;
            self.transport.position = 0;
            self.transport.running = play;
        }
        track.state = if play {
            TrackState::Playing
        } else {
            TrackState::Stopped
        };
    }
    pub fn stop_track(&mut self, track_id: usize) {
        let Some(track) = self.tracks.get_mut(track_id) else {
            return;
        };
        match track.state {
            TrackState::Recording => self.finish_recording(track_id, false),
            TrackState::Playing | TrackState::Overdubbing => track.state = TrackState::Stopped,
            TrackState::Empty | TrackState::Stopped => {}
        }
    }
    pub fn play(&mut self, track_id: usize) {
        let Some(track) = self.tracks.get_mut(track_id) else {
            return;
        };
        if track.state != TrackState::Stopped
            && !(track.mode == PlaybackMode::OneShot && track.state == TrackState::Playing)
        {
            return;
        }
        if track.mode == PlaybackMode::Loop && !self.transport.running {
            self.transport.position = 0;
            self.transport.running = true;
        }
        track.one_shot_position = 0;
        track.state = TrackState::Playing;
    }
    pub fn stop_transport(&mut self) {
        for track in &mut self.tracks {
            track.one_shot_position = 0;
            match track.state {
                TrackState::Recording => {
                    track.state = TrackState::Empty;
                    track.length = 0;
                    track.captured = 0;
                }
                TrackState::Playing | TrackState::Overdubbing => track.state = TrackState::Stopped,
                TrackState::Empty | TrackState::Stopped => {}
            }
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
        let capture_active = self
            .tracks
            .iter()
            .any(|track| matches!(track.state, TrackState::Recording | TrackState::Overdubbing));
        EngineSnapshot {
            tracks: std::array::from_fn(|index| {
                let track = &self.tracks[index];
                TrackSnapshot {
                    mode: track.mode,
                    can_set_mode: track.state == TrackState::Empty,
                    state: track.state,
                    length_samples: track.length,
                    captured_samples: track.captured,
                    position_samples: if track.mode == PlaybackMode::OneShot {
                        track.one_shot_position
                    } else {
                        self.cycle_position()
                    },
                    capacity_samples: track.recording.capacity(),
                    capture_limit_samples: if track.mode == PlaybackMode::OneShot
                        || self.transport.cycle_length == 0
                    {
                        track.recording.capacity()
                    } else {
                        self.transport.cycle_length
                    },
                    can_record: matches!(
                        track.state,
                        TrackState::Recording | TrackState::Overdubbing
                    ) || (!capture_active
                        && (self.transport.cycle_length == 0 || self.transport.running)
                        && ((track.state == TrackState::Empty
                            && track.recording.can_begin_capture())
                            || track.mode == PlaybackMode::Loop)),
                    can_play: track.state == TrackState::Stopped
                        || (track.mode == PlaybackMode::OneShot
                            && track.state == TrackState::Playing),
                    can_stop: matches!(
                        track.state,
                        TrackState::Recording | TrackState::Playing | TrackState::Overdubbing
                    ),
                }
            }),
            transport_running: self.transport.running,
            transport_position_samples: self.transport.position,
            cycle_length_samples: self.transport.cycle_length,
        }
    }
    pub fn process(&mut self, input: &[f32], output: &mut [f32]) {
        for (index, destination) in output.iter_mut().enumerate() {
            let advance = self.transport.running;
            let phase = self.cycle_position();
            let source = input.get(index).copied().unwrap_or(0.0);
            let mut sample = if self.monitoring { source } else { 0.0 };
            for track_id in 0..self.tracks.len() {
                let track = &mut self.tracks[track_id];
                match track.state {
                    TrackState::Empty | TrackState::Stopped => {}
                    TrackState::Recording => {
                        let independent =
                            track.mode == PlaybackMode::OneShot || self.transport.cycle_length == 0;
                        let position = if independent { track.captured } else { phase };
                        track.recording.write(position, source);
                        track.captured += 1;
                        if independent {
                            track.length = track.captured;
                        }
                        let limit = if independent {
                            track.recording.capacity()
                        } else {
                            self.transport.cycle_length
                        };
                        if track.captured == limit {
                            self.finish_recording(track_id, true);
                        }
                    }
                    TrackState::Playing | TrackState::Overdubbing => {
                        let position = if track.mode == PlaybackMode::OneShot {
                            track.one_shot_position
                        } else {
                            phase
                        };
                        let previous = track.recording.read(position);
                        if track.state == TrackState::Overdubbing {
                            let mixed = previous + source;
                            track.recording.write(phase, mixed);
                            sample += mixed;
                        } else {
                            sample += previous;
                            if track.mode == PlaybackMode::OneShot {
                                track.one_shot_position += 1;
                                if track.one_shot_position == track.length {
                                    track.state = TrackState::Stopped;
                                }
                            }
                        }
                    }
                }
            }
            *destination = sample.clamp(-1.0, 1.0);
            if advance {
                self.transport.position += 1;
            }
        }
    }
}

#[cfg(target_arch = "wasm32")]
mod wasm {
    use super::{LoopEngine, PlaybackMode};
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
    pub extern "C" fn record(track_id: usize) {
        with_engine(|engine| engine.record(track_id))
    }
    #[no_mangle]
    pub extern "C" fn play(track_id: usize) {
        with_engine(|engine| engine.play(track_id))
    }
    #[no_mangle]
    pub extern "C" fn stop_track(track_id: usize) {
        with_engine(|engine| engine.stop_track(track_id))
    }
    #[no_mangle]
    pub extern "C" fn stop_transport() {
        with_engine(|engine| engine.stop_transport())
    }
    #[no_mangle]
    pub extern "C" fn track_state(track_id: usize) -> u32 {
        with_engine(|engine| {
            engine
                .snapshot()
                .tracks
                .get(track_id)
                .map(|track| track.state as u32)
                .unwrap_or_default()
        })
    }
    #[no_mangle]
    pub extern "C" fn loop_length(track_id: usize) -> usize {
        with_engine(|engine| {
            engine
                .snapshot()
                .tracks
                .get(track_id)
                .map(|track| track.length_samples)
                .unwrap_or_default()
        })
    }
    #[no_mangle]
    pub extern "C" fn loop_position(track_id: usize) -> usize {
        with_engine(|engine| {
            engine
                .snapshot()
                .tracks
                .get(track_id)
                .map(|track| track.position_samples)
                .unwrap_or_default()
        })
    }
    #[no_mangle]
    pub extern "C" fn recording_capacity(track_id: usize) -> usize {
        with_engine(|engine| {
            engine
                .snapshot()
                .tracks
                .get(track_id)
                .map(|track| track.capacity_samples)
                .unwrap_or_default()
        })
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
    pub extern "C" fn can_record(track_id: usize) -> u32 {
        with_engine(|engine| {
            engine
                .snapshot()
                .tracks
                .get(track_id)
                .map(|track| track.can_record)
                .unwrap_or_default() as u32
        })
    }
    #[no_mangle]
    pub extern "C" fn can_play(track_id: usize) -> u32 {
        with_engine(|engine| {
            engine
                .snapshot()
                .tracks
                .get(track_id)
                .map(|track| track.can_play)
                .unwrap_or_default() as u32
        })
    }
    #[no_mangle]
    pub extern "C" fn can_stop(track_id: usize) -> u32 {
        with_engine(|engine| {
            engine
                .snapshot()
                .tracks
                .get(track_id)
                .map(|track| track.can_stop)
                .unwrap_or_default() as u32
        })
    }
    #[no_mangle]
    pub extern "C" fn captured_samples(track_id: usize) -> usize {
        with_engine(|engine| {
            engine
                .snapshot()
                .tracks
                .get(track_id)
                .map(|track| track.captured_samples)
                .unwrap_or_default()
        })
    }
    #[no_mangle]
    pub extern "C" fn capture_limit(track_id: usize) -> usize {
        with_engine(|engine| {
            engine
                .snapshot()
                .tracks
                .get(track_id)
                .map(|track| track.capture_limit_samples)
                .unwrap_or_default()
        })
    }
    #[no_mangle]
    pub extern "C" fn set_mode(track_id: usize, mode: u32) {
        let mode = match mode {
            0 => PlaybackMode::Loop,
            1 => PlaybackMode::OneShot,
            _ => return,
        };
        with_engine(|engine| engine.set_mode(track_id, mode));
    }
    #[no_mangle]
    pub extern "C" fn playback_mode(track_id: usize) -> u32 {
        with_engine(|engine| {
            engine
                .snapshot()
                .tracks
                .get(track_id)
                .map(|track| track.mode as u32)
                .unwrap_or_default()
        })
    }
    #[no_mangle]
    pub extern "C" fn can_set_mode(track_id: usize) -> u32 {
        with_engine(|engine| {
            engine
                .snapshot()
                .tracks
                .get(track_id)
                .map(|track| track.can_set_mode as u32)
                .unwrap_or_default()
        })
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
