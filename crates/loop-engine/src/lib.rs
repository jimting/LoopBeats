//! Browser-independent processing. Loop recording follows in later tickets.
#[derive(Default)]
pub struct LoopEngine {
    monitoring: bool,
}

impl LoopEngine {
    pub const fn new() -> Self {
        Self { monitoring: false }
    }
    pub fn set_monitoring(&mut self, enabled: bool) {
        self.monitoring = enabled;
    }
    pub fn monitoring(&self) -> bool {
        self.monitoring
    }
    pub fn process(&mut self, input: &[f32], output: &mut [f32]) {
        output.fill(0.0);
        if self.monitoring {
            for (source, destination) in input.iter().zip(output.iter_mut()) {
                *destination = *source;
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
    static mut ENGINE: LoopEngine = LoopEngine::new();
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
            (*core::ptr::addr_of_mut!(ENGINE)).set_monitoring(enabled != 0);
        }
    }
    #[no_mangle]
    pub extern "C" fn monitoring() -> u32 {
        // SAFETY: same single-worklet ownership as processing/commands.
        unsafe { (*core::ptr::addr_of!(ENGINE)).monitoring() as u32 }
    }
    #[no_mangle]
    pub extern "C" fn process(frames: usize) -> usize {
        if frames > CAPACITY {
            return 0;
        }
        // SAFETY: disjoint static buffers; bounded length; one serialized host
        // owner which must not access buffers during processing.
        unsafe {
            (*core::ptr::addr_of_mut!(ENGINE)).process(
                core::slice::from_raw_parts(input_ptr(), frames),
                core::slice::from_raw_parts_mut(output_ptr(), frames),
            );
        }
        frames
    }
}
