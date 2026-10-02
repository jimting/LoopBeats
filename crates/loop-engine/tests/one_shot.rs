use loop_engine::{LoopEngine, PlaybackMode, TrackState};

#[test]
fn one_shot_plays_from_zero_once_and_retriggers_during_playback() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.set_mode(0, PlaybackMode::OneShot);
    engine.record(0);
    engine.process(&[0.25, -0.5, 0.75], &mut [0.0; 3]);
    engine.record(0);
    assert_eq!(engine.snapshot().cycle_length_samples, 0);
    assert!(!engine.snapshot().transport_running);
    let mut output = [9.0; 2];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.25, -0.5]);
    assert!(engine.snapshot().tracks[0].can_play);
    engine.play(0);
    let mut output = [9.0; 5];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.25, -0.5, 0.75, 0.0, 0.0]);
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Stopped);
    assert_eq!(engine.snapshot().tracks[0].position_samples, 3);
    assert!(!engine.snapshot().tracks[0].can_record);
    engine.record(0);
    engine.play(0);
    engine.process(&[], &mut output[..3]);
    assert_eq!(&output[..3], &[0.25, -0.5, 0.75]);
}

#[test]
fn capture_duration_and_playback_position_are_independent_of_running_loop_cycle() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.set_mode(1, PlaybackMode::OneShot);
    engine.record(0);
    engine.process(&[0.125; 3], &mut [0.0; 3]);
    engine.record(0);
    engine.process(&[], &mut [0.0; 2]);
    engine.record(1);
    assert!(!engine.snapshot().tracks[0].can_record);
    engine.record(0); // Cannot steal capture with an overdub.
    let mut output = [0.0; 5];
    engine.process(&[0.25; 5], &mut output);
    assert_eq!(output, [0.125; 5]);
    assert_eq!(engine.snapshot().tracks[1].state, TrackState::Recording);
    engine.record(1);
    assert_eq!(engine.snapshot().cycle_length_samples, 3);
    assert_eq!(engine.snapshot().transport_position_samples, 7);
    assert_eq!(engine.snapshot().tracks[1].position_samples, 0);
    let mut output = [0.0; 7];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.375, 0.375, 0.375, 0.375, 0.375, 0.125, 0.125]);
    assert_eq!(engine.snapshot().tracks[1].state, TrackState::Stopped);
    assert_eq!(engine.snapshot().cycle_length_samples, 3);
    assert_eq!(engine.snapshot().transport_position_samples, 14);
    engine.play(1);
    assert_eq!(engine.snapshot().tracks[1].position_samples, 0);
    engine.stop_transport();
    assert_eq!(engine.snapshot().tracks[1].state, TrackState::Stopped);
    assert_eq!(engine.snapshot().tracks[1].length_samples, 5);
    engine.play(1);
    assert!(!engine.snapshot().transport_running); // One-shot never restarts Loop transport.
}

#[test]
fn global_stop_discards_unfinished_one_shot_but_retains_cycle_and_existing_loop() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.set_mode(1, PlaybackMode::OneShot);
    engine.record(0);
    engine.process(&[0.125; 3], &mut [0.0; 3]);
    engine.record(0);
    engine.record(1);
    engine.process(&[0.75; 4], &mut [0.0; 4]);
    engine.stop_transport();
    assert_eq!(engine.snapshot().tracks[1].state, TrackState::Empty);
    assert_eq!(engine.snapshot().tracks[1].length_samples, 0);
    assert_eq!(engine.snapshot().cycle_length_samples, 3);
    assert!(!engine.snapshot().tracks[1].can_record); // Agreed stopped-cycle REC gate.
    engine.play(0);
    engine.record(1);
    engine.process(&[0.25], &mut [0.0; 1]);
    engine.record(1);
    let mut output = [0.0; 3];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.375, 0.125, 0.125]);
}

#[test]
fn track_stop_retains_one_shot_without_establishing_or_starting_transport() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.set_mode(0, PlaybackMode::OneShot);
    engine.record(0);
    engine.process(&[0.25, -0.5], &mut [0.0; 2]);
    engine.stop_track(0);
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Stopped);
    assert_eq!(engine.snapshot().cycle_length_samples, 0);
    assert!(!engine.snapshot().transport_running);
    engine.play(0);
    let mut output = [0.0; 4];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.25, -0.5, 0.0, 0.0]);
    assert!(engine.snapshot().tracks[0].can_set_mode);
}

#[test]
fn one_shot_sixty_second_limit_completes_once_without_missing_boundary_samples() {
    let mut engine = LoopEngine::with_sample_rate(8000);
    engine.set_mode(0, PlaybackMode::OneShot);
    engine.record(0);
    engine.process(&vec![0.25; 479999], &mut vec![0.0; 479999]);
    let mut boundary = [9.0; 3];
    engine.process(&[0.75, 0.9, 0.9], &mut boundary);
    assert_eq!(boundary, [0.0, 0.25, 0.25]);
    assert_eq!(engine.snapshot().tracks[0].length_samples, 480000);
    assert_eq!(engine.snapshot().cycle_length_samples, 0);
    let mut remainder = vec![9.0; 480000];
    engine.process(&[], &mut remainder);
    assert_eq!(remainder[479997], 0.75);
    assert_eq!(&remainder[479998..], &[0.0; 2]);
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Stopped);
}

#[test]
fn zero_sample_completion_can_retry_but_mode_changes_during_capture_are_rejected() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.set_mode(0, PlaybackMode::OneShot);
    engine.record(0);
    assert!(!engine.snapshot().tracks[0].can_set_mode);
    engine.set_mode(0, PlaybackMode::Loop);
    assert_eq!(engine.snapshot().tracks[0].mode, PlaybackMode::OneShot);
    engine.record(0);
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Empty);
    assert!(engine.snapshot().tracks[0].can_record);
    assert!(!engine.snapshot().tracks[0].can_play);
    engine.set_mode(2, PlaybackMode::OneShot);
}
