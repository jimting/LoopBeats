use loop_engine::{LoopEngine, PlaybackMode, TrackState};

#[test]
fn clear_preserves_cycle_and_other_audio_and_reuses_storage_without_stale_samples() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.25; 3], &mut [0.0; 3]);
    engine.record(0);
    engine.record(1);
    engine.process(&[0.75; 3], &mut [0.0; 3]);
    engine.clear(1);
    assert_eq!(engine.snapshot().tracks[1].state, TrackState::Empty);
    assert_eq!(engine.snapshot().tracks[1].length_samples, 0);
    assert_eq!(engine.snapshot().cycle_length_samples, 3);
    assert_eq!(engine.snapshot().transport_position_samples, 3);
    engine.record(1);
    engine.process(&[0.125], &mut [0.0; 1]);
    engine.record(1);
    let mut output = [0.0; 4];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.25, 0.25, 0.375, 0.25]);
    engine.clear(0);
    engine.clear(1);
    assert_eq!(engine.snapshot().cycle_length_samples, 3);
    assert!(engine.snapshot().transport_running);
    engine.clear(2);
}

#[test]
fn reset_removes_all_audio_and_cycle_and_allows_new_length_without_reallocating_storage() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.75; 3], &mut [0.0; 3]);
    engine.record(0);
    engine.set_mode(1, PlaybackMode::OneShot);
    engine.record(1);
    engine.process(&[0.5; 2], &mut [0.0; 2]);
    engine.record(1);
    engine.set_monitoring(true);
    engine.set_track_gain(0, 0.5);
    engine.set_master_gain(0.25);
    engine.reset();
    assert_eq!(engine.snapshot().cycle_length_samples, 0);
    assert_eq!(engine.snapshot().transport_position_samples, 0);
    assert!(!engine.snapshot().transport_running);
    assert!(!engine.monitoring());
    assert_eq!(engine.snapshot().master_gain, 0.25);
    assert_eq!(engine.snapshot().tracks[0].gain, 0.5);
    assert_eq!(engine.snapshot().tracks[1].mode, PlaybackMode::OneShot);
    assert!(engine
        .snapshot()
        .tracks
        .iter()
        .all(|t| t.state == TrackState::Empty && t.capacity_samples == 8));
    let mut output = [1.0; 4];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.0; 4]);
    engine.record(0);
    engine.process(&[0.25; 2], &mut [0.0; 2]);
    engine.record(0);
    assert_eq!(engine.snapshot().cycle_length_samples, 2);
    engine.process(&[], &mut output);
    assert_eq!(output, [0.03125; 4]);
}

#[test]
fn clear_during_capture_overdub_and_one_shot_releases_ownership_and_preserves_settings() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.set_mode(0, PlaybackMode::OneShot);
    engine.set_track_gain(0, 0.5);
    engine.set_track_mute(0, true);
    engine.record(0);
    engine.process(&[0.75; 3], &mut [0.0; 3]);
    engine.clear(0);
    assert!(engine.snapshot().tracks[1].can_record);
    engine.record(0);
    engine.process(&[0.25], &mut [0.0; 1]);
    engine.record(0);
    engine.clear(0);
    assert_eq!(engine.snapshot().tracks[0].mode, PlaybackMode::OneShot);
    assert_eq!(engine.snapshot().tracks[0].gain, 0.5);
    assert!(engine.snapshot().tracks[0].muted);
    engine.set_track_mute(0, false);
    engine.record(0);
    engine.process(&[0.5], &mut [0.0; 1]);
    engine.record(0);
    let mut output = [1.0; 2];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.25, 0.0]);
    engine.record(1);
    engine.process(&[0.125; 2], &mut [0.0; 2]);
    engine.record(1);
    engine.record(1);
    engine.process(&[0.25], &mut [0.0; 1]);
    engine.clear(1);
    assert_eq!(engine.snapshot().tracks[1].state, TrackState::Empty);
    assert_eq!(engine.snapshot().cycle_length_samples, 2);
    assert!(engine.snapshot().tracks[1].can_record);
    engine.process(&[], &mut output);
    assert_eq!(output, [0.0; 2]);
}
