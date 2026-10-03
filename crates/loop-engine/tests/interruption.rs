use loop_engine::{LoopEngine, PlaybackMode, TrackState};

#[test]
fn interruption_discards_initial_capture_retains_completed_audio_and_turns_monitoring_off() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.set_mode(1, PlaybackMode::OneShot);
    engine.record(0);
    engine.process(&[0.25, -0.5], &mut [0.0; 2]);
    engine.record(0);
    engine.record(1);
    engine.process(&[0.75; 3], &mut [0.0; 3]);
    engine.set_monitoring(true);
    engine.interrupt();
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Stopped);
    assert_eq!(engine.snapshot().tracks[1].state, TrackState::Empty);
    assert_eq!(engine.snapshot().cycle_length_samples, 2);
    assert_eq!(engine.snapshot().transport_position_samples, 0);
    assert!(!engine.monitoring());
    let mut output = [1.0; 3];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.0; 3]);
    engine.play(0);
    engine.process(&[], &mut output);
    assert_eq!(output, [0.25, -0.5, 0.25]);
}

#[test]
fn interruption_during_initial_capture_discards_partial_track_only() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.25, -0.5], &mut [0.0; 2]);
    engine.record(0);

    engine.record(1);
    engine.process(&[0.75], &mut [0.0; 1]);
    engine.interrupt();

    let snapshot = engine.snapshot();
    assert_eq!(snapshot.tracks[0].state, TrackState::Stopped);
    assert_eq!(snapshot.tracks[1].state, TrackState::Empty);
    assert_eq!(snapshot.tracks[0].length_samples, 2);
    assert_eq!(snapshot.transport_position_samples, 0);
}

#[test]
fn interruption_during_overdub_stops_track_and_retains_additions() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.25, -0.5], &mut [0.0; 2]);
    engine.record(0);
    engine.process(&[], &mut [0.0; 1]);

    engine.record(0);
    engine.process(&[0.25], &mut [0.0; 1]);
    engine.interrupt();

    let snapshot = engine.snapshot();
    assert_eq!(snapshot.tracks[0].state, TrackState::Stopped);
    assert_eq!(snapshot.tracks[0].length_samples, 2);
    assert_eq!(snapshot.transport_position_samples, 0);

    engine.play(0);
    let mut output = [0.0; 2];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.25, -0.25]);
}
