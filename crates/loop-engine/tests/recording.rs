use loop_engine::{LoopEngine, TrackState};

#[test]
fn first_recording_replays_exact_samples_from_zero_across_block_boundaries() {
    let mut engine = LoopEngine::new();
    engine.record(0);
    let mut output = [9.0; 2];
    engine.process(&[0.25, -0.5], &mut output);
    assert_eq!(output, [0.0; 2]);
    engine.process(&[0.75], &mut output[..1]);
    engine.record(0);
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Playing);
    assert_eq!(engine.snapshot().tracks[0].length_samples, 3);
    assert_eq!(engine.snapshot().tracks[0].position_samples, 0);
    let mut playback = [0.0; 8];
    engine.process(&[0.9; 8], &mut playback);
    assert_eq!(playback, [0.25, -0.5, 0.75, 0.25, -0.5, 0.75, 0.25, -0.5]);
    assert_eq!(engine.snapshot().tracks[0].position_samples, 2);
}

#[test]
fn capture_progress_is_engine_owned_and_empty_completion_can_retry() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.record(0);
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Empty);
    engine.record(0);
    engine.process(&[0.1, 0.2], &mut [0.0; 2]);
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Recording);
    assert_eq!(engine.snapshot().tracks[0].length_samples, 2);
    assert_eq!(engine.snapshot().tracks[0].position_samples, 0);
}

#[test]
fn fixed_capture_capacity_finishes_without_losing_the_last_sample() {
    let mut engine = LoopEngine::with_capacity(3);
    engine.record(0);
    let mut output = [9.0; 5];
    engine.process(&[0.25, -0.5, 0.75, 0.9, 0.9], &mut output);
    assert_eq!(output, [0.0, 0.0, 0.0, 0.25, -0.5]);
    assert_eq!(engine.snapshot().tracks[0].length_samples, 3);
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Playing);
}

#[test]
fn live_monitoring_is_independent_of_capture_and_loop_playback() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.set_monitoring(true);
    engine.record(0);
    let mut output = [0.0; 2];
    engine.process(&[0.25, -0.5], &mut output);
    assert_eq!(output, [0.25, -0.5]);
    engine.record(0);
    engine.process(&[0.1, 0.2], &mut output);
    assert_eq!(output, [0.35, -0.3]);
    engine.set_monitoring(false);
    engine.process(&[0.9, 0.9], &mut output);
    assert_eq!(output, [0.25, -0.5]);
}

#[test]
fn many_cycles_and_zero_input_overdub_do_not_change_length_or_phase() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.25, -0.5, 0.75], &mut [0.0; 3]);
    engine.record(0);
    let mut output = [0.0; 7];
    for _ in 0..3000 {
        engine.process(&[], &mut output);
    }
    assert_eq!(output, [0.75, 0.25, -0.5, 0.75, 0.25, -0.5, 0.75]);
    assert_eq!(engine.snapshot().tracks[0].position_samples, 0);
    engine.record(0);
    assert_eq!(engine.snapshot().tracks[0].length_samples, 3);
    engine.process(&[], &mut output[..3]);
    assert_eq!(&output[..3], &[0.25, -0.5, 0.75]);
}

#[test]
fn monitoring_plus_playback_protects_output_without_altering_recording() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.75, -0.75], &mut [0.0; 2]);
    engine.record(0);
    engine.set_monitoring(true);
    let mut output = [0.0; 2];
    engine.process(&[0.75, -0.75], &mut output);
    assert_eq!(output, [1.0, -1.0]);
    engine.set_monitoring(false);
    engine.process(&[], &mut output);
    assert_eq!(output, [0.75, -0.75]);
}
