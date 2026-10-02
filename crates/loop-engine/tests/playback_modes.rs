use loop_engine::{LoopEngine, PlaybackMode, TrackState};

#[test]
fn stopped_loop_can_play_once_from_zero_without_changing_running_cycle() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.25, -0.5, 0.75], &mut [0.0; 3]);
    engine.record(0);
    engine.process(&[], &mut [0.0; 2]);
    engine.set_mode(0, PlaybackMode::OneShot); // Cannot change while Playing.
    assert_eq!(engine.snapshot().tracks[0].mode, PlaybackMode::Loop);
    engine.stop_track(0);
    assert!(engine.snapshot().tracks[0].can_set_mode);
    engine.set_mode(0, PlaybackMode::OneShot);
    assert_eq!(engine.snapshot().tracks[0].mode, PlaybackMode::OneShot);
    assert_eq!(engine.snapshot().transport_position_samples, 2);
    engine.play(0);
    let mut output = [0.0; 5];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.25, -0.5, 0.75, 0.0, 0.0]);
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Stopped);
    assert_eq!(engine.snapshot().cycle_length_samples, 3);
    assert_eq!(engine.snapshot().transport_position_samples, 7);
}

#[test]
fn one_shot_requires_exact_cycle_length_and_compatible_play_joins_current_phase() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.set_mode(1, PlaybackMode::OneShot);
    engine.record(0);
    engine.process(&[0.0; 3], &mut [0.0; 3]);
    engine.record(0);
    engine.record(1);
    engine.process(&[0.25, -0.5], &mut [0.0; 2]);
    engine.stop_track(1);
    engine.set_mode(1, PlaybackMode::Loop);
    assert_eq!(engine.snapshot().tracks[1].mode, PlaybackMode::OneShot);
    engine.play(1);
    let mut output = [0.0; 3];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.25, -0.5, 0.0]);

    let mut compatible = LoopEngine::with_capacity(8);
    compatible.set_mode(1, PlaybackMode::OneShot);
    compatible.record(0);
    compatible.process(&[0.0; 3], &mut [0.0; 3]);
    compatible.record(0);
    compatible.record(1);
    compatible.process(&[0.25, -0.5, 0.75], &mut [0.0; 3]);
    compatible.stop_track(1);
    compatible.process(&[], &mut [0.0; 2]);
    compatible.set_mode(1, PlaybackMode::Loop);
    assert_eq!(compatible.snapshot().tracks[1].mode, PlaybackMode::Loop);
    compatible.play(1);
    let mut output = [0.0; 4];
    compatible.process(&[], &mut output);
    assert_eq!(output, [0.75, 0.25, -0.5, 0.75]);
}

#[test]
fn converted_recording_establishes_first_cycle_on_play_and_only_starts_selected_track() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.set_mode(0, PlaybackMode::OneShot);
    engine.set_mode(1, PlaybackMode::OneShot);
    engine.record(1);
    engine.process(&[0.125], &mut [0.0; 1]);
    engine.stop_track(1);
    engine.record(0);
    engine.process(&[0.25, -0.5, 0.75], &mut [0.0; 3]);
    engine.stop_track(0);
    engine.set_mode(0, PlaybackMode::Loop);
    assert_eq!(engine.snapshot().cycle_length_samples, 0);
    assert!(!engine.snapshot().transport_running);
    engine.play(0);
    assert_eq!(engine.snapshot().cycle_length_samples, 3);
    assert!(engine.snapshot().transport_running);
    assert_eq!(engine.snapshot().tracks[1].state, TrackState::Stopped);
    let mut output = [0.0; 4];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.25, -0.5, 0.75, 0.25]);
}

#[test]
fn converted_recording_establishes_cycle_on_rec_and_immediately_overdubs() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.set_mode(0, PlaybackMode::OneShot);
    engine.record(0);
    engine.process(&[0.25, -0.5, 0.75], &mut [0.0; 3]);
    engine.stop_track(0);
    engine.set_mode(0, PlaybackMode::Loop);
    assert!(engine.snapshot().tracks[0].can_record);
    engine.record(0);
    assert_eq!(engine.snapshot().cycle_length_samples, 3);
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Overdubbing);
    assert!(engine.snapshot().transport_running);
    engine.set_mode(0, PlaybackMode::OneShot); // Cannot change while overdubbing.
    assert_eq!(engine.snapshot().tracks[0].mode, PlaybackMode::Loop);
    let mut output = [0.0; 4];
    engine.process(&[0.125; 4], &mut output);
    assert_eq!(output, [0.375, -0.375, 0.875, 0.5]);
    engine.record(0);
    engine.stop_track(0);
    engine.set_mode(0, PlaybackMode::OneShot);
    engine.play(0);
    let mut output = [0.0; 4];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.5, -0.375, 0.875, 0.0]);
}

#[test]
fn later_cycle_establishment_cannot_launch_a_previously_converted_incompatible_loop() {
    let mut engine = LoopEngine::with_capacity(8);
    for (track, samples) in [(0, vec![0.25; 3]), (1, vec![0.75; 2])] {
        engine.set_mode(track, PlaybackMode::OneShot);
        engine.record(track);
        engine.process(&samples, &mut vec![0.0; samples.len()]);
        engine.stop_track(track);
        engine.set_mode(track, PlaybackMode::Loop);
    }
    engine.play(0);
    assert!(!engine.snapshot().tracks[1].can_play);
    assert!(!engine.snapshot().tracks[1].can_record);
    engine.play(1);
    engine.record(1);
    assert_eq!(engine.snapshot().tracks[1].state, TrackState::Stopped);
    engine.set_mode(1, PlaybackMode::OneShot);
    engine.play(1);
    let mut output = [0.0; 3];
    engine.process(&[], &mut output);
    assert_eq!(output, [1.0, 1.0, 0.25]);
}
