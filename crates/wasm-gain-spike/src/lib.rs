//! Disposable gain experiment, separate from the loop engine.

pub fn apply_gain(input: &[f32], output: &mut [f32], gain: f32) {
    for (source, destination) in input.iter().zip(output.iter_mut()) {
        *destination = *source * gain;
    }
}

// Fixed buffers belong to one WASM instance and one serialized worklet.
// No allocator, memory growth or browser dependency in this processing path.
#[cfg(target_arch = "wasm32")]
mod bridge {
    const CAPACITY: usize = 2048;
    static mut INPUT: [f32; CAPACITY] = [0.0; CAPACITY];
    static mut OUTPUT: [f32; CAPACITY] = [0.0; CAPACITY];

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
    pub extern "C" fn process_gain(frames: usize, gain: f32) -> usize {
        if frames > CAPACITY {
            return 0;
        }
        // SAFETY: separate fixed buffers, bounded length, serialized calls from
        // one worklet; the host must not access buffers during this call.
        unsafe {
            let input = core::slice::from_raw_parts(input_ptr(), frames);
            let output = core::slice::from_raw_parts_mut(output_ptr(), frames);
            super::apply_gain(input, output, gain);
        }
        frames
    }
}
