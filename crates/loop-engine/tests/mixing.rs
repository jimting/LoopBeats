use loop_engine::{LoopEngine, PlaybackMode, TrackState};

#[test]
fn track_and_master_gain_mix_before_output_protection_and_do_not_change_recordings() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.5, -0.5], &mut [0.0; 2]);
    engine.record(0);
    engine.record(1);
    engine.process(&[0.25, -0.25], &mut [0.0; 2]);
    engine.set_track_gain(0, 0.5);
    engine.set_track_gain(1, 0.25);
    engine.set_master_gain(0.5);
    let mut output = [0.0; 2];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.15625, -0.15625]);
    engine.set_track_gain(0, 1.0);
    engine.set_track_gain(1, 1.0);
    engine.set_master_gain(1.0);
    engine.process(&[], &mut output);
    assert_eq!(output, [0.75, -0.75]);
    engine.set_monitoring(true);
    engine.set_master_gain(0.5);
    engine.process(&[1.0, -1.0], &mut output);
    assert_eq!(output, [0.875, -0.875]); // Master applies before the final clamp.
}

#[test]
fn mute_advances_loop_phase_without_silencing_independent_monitoring() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.25, 0.5, 0.75], &mut [0.0; 3]);
    engine.record(0);
    engine.set_track_mute(0, true);
    engine.set_monitoring(true);
    let mut output = [0.0; 2];
    engine.process(&[0.125; 2], &mut output);
    assert_eq!(output, [0.125; 2]);
    assert_eq!(engine.snapshot().tracks[0].position_samples, 2);
    engine.set_monitoring(false);
    engine.set_track_mute(0, false);
    engine.process(&[], &mut output);
    assert_eq!(output, [0.75, 0.25]);
}

#[test]
fn muted_capture_and_overdub_keep_input_at_full_volume_and_one_shot_ends_normally() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.set_track_mute(0, true);
    engine.set_track_gain(0, 0.25);
    engine.record(0);
    engine.process(&[0.25, 0.5], &mut [0.0; 2]);
    engine.record(0);
    engine.record(0);
    let mut output = [1.0; 3];
    engine.process(&[0.125; 3], &mut output);
    assert_eq!(output, [0.0; 3]);
    engine.record(0);
    engine.set_track_mute(0, false);
    engine.set_track_gain(0, 1.0);
    engine.process(&[], &mut output);
    assert_eq!(output, [0.625, 0.5, 0.625]);
    assert_eq!(engine.snapshot().tracks[0].length_samples, 2);

    let mut shot = LoopEngine::with_capacity(8);
    shot.set_mode(1, PlaybackMode::OneShot);
    shot.set_track_mute(1, true);
    shot.record(1);
    shot.process(&[0.25, 0.5], &mut [0.0; 2]);
    shot.record(1);
    shot.process(&[], &mut output);
    assert_eq!(output, [0.0; 3]);
    assert_eq!(shot.snapshot().tracks[1].state, TrackState::Stopped);
    assert_eq!(shot.snapshot().tracks[1].position_samples, 2);
    shot.set_track_mute(1, false);
    shot.play(1);
    shot.process(&[], &mut output);
    assert_eq!(output, [0.25, 0.5, 0.0]);
}

#[test]
fn invalid_gains_and_track_ids_cannot_corrupt_mix_or_produce_nonfinite_output() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.set_monitoring(true);
    engine.set_master_gain(0.5);
    engine.set_track_gain(0, 0.25);
    for invalid in [f32::NAN, f32::INFINITY, -0.1, 1.1] {
        engine.set_master_gain(invalid);
        engine.set_track_gain(0, invalid);
    }
    engine.set_track_gain(2, 0.0);
    engine.set_track_mute(2, true);
    let mut output = [0.0; 2];
    engine.process(&[0.5, -0.5], &mut output);
    assert_eq!(output, [0.25, -0.25]);
    assert_eq!(engine.snapshot().master_gain, 0.5);
    assert_eq!(engine.snapshot().tracks[0].gain, 0.25);
}
