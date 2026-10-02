use loop_engine::{LoopEngine, TrackState};

#[test]
fn immediate_overdub_adds_at_full_volume_over_multiple_cycles_without_changing_length() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.25, -0.5, 0.75], &mut [0.0; 3]);
    engine.record(0);
    engine.process(&[], &mut [0.0; 1]);
    engine.record(0);
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Overdubbing);
    let mut output = [0.0; 7];
    engine.process(&[0.25; 7], &mut output);
    assert_eq!(output, [-0.25, 1.0, 0.5, 0.0, 1.0, 0.75, 0.25]);
    engine.record(0);
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Playing);
    assert_eq!(engine.snapshot().tracks[0].length_samples, 3);
    engine.process(&[], &mut output[..3]);
    assert_eq!(&output[..3], &[1.0, 0.75, 0.25]);
}

#[test]
fn stopped_loop_overdub_joins_phase_and_track_stop_retains_partial_additions() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.25; 4], &mut [0.0; 4]);
    engine.record(0);
    engine.stop_track(0);
    engine.process(&[], &mut [0.0; 2]);
    engine.record(0);
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Overdubbing);
    let mut output = [0.0; 2];
    engine.process(&[0.5, -0.25], &mut output);
    assert_eq!(output, [0.75, 0.0]);
    engine.stop_track(0);
    assert!(engine.snapshot().transport_running);
    engine.process(&[], &mut output);
    assert_eq!(output, [0.0; 2]);
    engine.play(0);
    let mut output = [0.0; 4];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.75, 0.0, 0.25, 0.25]);
    engine.stop_transport();
    assert!(!engine.snapshot().tracks[0].can_record);
    engine.record(0);
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Stopped);
}

#[test]
fn global_stop_retains_overdub_and_capture_exclusion_keeps_other_playback_running() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.125; 4], &mut [0.0; 4]);
    engine.record(0);
    engine.record(1);
    engine.process(&[0.25; 4], &mut [0.0; 4]);
    engine.record(0);
    assert!(!engine.snapshot().tracks[1].can_record);
    assert!(engine.snapshot().tracks[0].can_record);
    engine.record(1);
    assert_eq!(engine.snapshot().tracks[1].state, TrackState::Playing);
    let mut output = [0.0; 2];
    engine.process(&[0.125; 2], &mut output);
    assert_eq!(output, [0.5; 2]);
    engine.stop_transport();
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Stopped);
    assert_eq!(engine.snapshot().tracks[1].state, TrackState::Stopped);
    engine.play(0);
    let mut output = [0.0; 4];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.25, 0.25, 0.125, 0.125]);
}

#[test]
fn overdub_fills_uncaptured_positions_without_reviving_discarded_audio() {
    let mut engine = LoopEngine::with_capacity(128);
    engine.record(0);
    engine.process(&[], &mut [0.0; 70]); // Cross validity-word boundary.
    engine.record(0);
    engine.record(1);
    engine.process(&[0.75; 68], &mut [0.0; 68]);
    engine.stop_transport(); // Discard old capture.
    engine.play(0);
    engine.record(1);
    engine.process(&[0.25; 1], &mut [0.0; 1]);
    engine.record(1); // Only position zero is captured.
    engine.record(1); // Immediate overdub at position one, previously silent.
    let mut output = [0.0; 69];
    engine.process(&[0.125; 69], &mut output);
    assert_eq!(output, [0.125; 69]);
    engine.record(1);
    let mut output = [0.0; 70];
    engine.process(&[], &mut output);
    assert_eq!(output[0], 0.25);
    assert_eq!(&output[1..], &[0.125; 69]);
}

#[test]
fn output_clamp_does_not_clip_stored_overdub_or_apply_feedback() {
    let mut engine = LoopEngine::with_capacity(4);
    engine.record(0);
    engine.process(&[0.75, -0.75], &mut [0.0; 2]);
    engine.record(0);
    engine.record(0);
    let mut output = [0.0; 2];
    engine.process(&[0.75, -0.75], &mut output);
    assert_eq!(output, [1.0, -1.0]); // Stored values are 1.5 and -1.5.
    engine.process(&[-0.75, 0.75], &mut output);
    assert_eq!(output, [0.75, -0.75]); // Unclipped recording + input, full feedback.
    engine.record(0);
    engine.process(&[], &mut output);
    assert_eq!(output, [0.75, -0.75]);
}
