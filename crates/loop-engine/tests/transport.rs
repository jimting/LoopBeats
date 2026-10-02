use loop_engine::{LoopEngine, TrackState};

#[test]
fn track_stop_finishes_first_capture_silently_and_play_starts_at_zero() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record();
    engine.process(&[0.25, -0.5, 0.75], &mut [0.0; 3]);
    engine.stop_track();
    assert_eq!(engine.snapshot().state, TrackState::Stopped);
    assert_eq!(engine.snapshot().cycle_length_samples, 3);
    assert!(!engine.snapshot().transport_running);
    let mut output = [9.0; 4];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.0; 4]);
    assert_eq!(engine.snapshot().transport_position_samples, 0);
    engine.play();
    engine.process(&[], &mut output);
    assert_eq!(output, [0.25, -0.5, 0.75, 0.25]);
    assert!(engine.snapshot().transport_running);
}

#[test]
fn global_stop_retains_completed_audio_and_restarts_from_zero() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record();
    engine.process(&[0.25, -0.5, 0.75], &mut [0.0; 3]);
    engine.record();
    engine.process(&[], &mut [0.0; 5]);
    engine.stop_transport();
    assert_eq!(engine.snapshot().state, TrackState::Stopped);
    assert_eq!(engine.snapshot().transport_position_samples, 0);
    assert_eq!(engine.snapshot().cycle_length_samples, 3);
    assert!(!engine.snapshot().can_record);
    engine.record();
    assert_eq!(engine.snapshot().state, TrackState::Stopped);
    let mut output = [9.0; 3];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.0; 3]);
    engine.play();
    engine.process(&[], &mut output);
    assert_eq!(output, [0.25, -0.5, 0.75]);
}

#[test]
fn global_stop_discards_unfinished_capture_and_a_new_capture_has_no_stale_audio() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record();
    engine.process(&[0.25, -0.5], &mut [0.0; 2]);
    engine.stop_transport();
    assert_eq!(engine.snapshot().state, TrackState::Empty);
    assert_eq!(engine.snapshot().length_samples, 0);
    assert_eq!(engine.snapshot().cycle_length_samples, 0);
    assert!(engine.snapshot().can_record);
    assert!(!engine.snapshot().can_play);
    engine.record();
    engine.process(&[0.75], &mut [0.0; 1]);
    engine.record();
    let mut output = [0.0; 4];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.75; 4]);
}

#[test]
fn individual_stop_keeps_transport_advancing_and_play_joins_current_phase() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record();
    engine.process(&[0.25, -0.5, 0.75], &mut [0.0; 3]);
    engine.record();
    engine.process(&[], &mut [0.0; 1]);
    engine.stop_track();
    let mut output = [9.0; 1];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.0]);
    assert!(engine.snapshot().transport_running);
    assert_eq!(engine.snapshot().transport_position_samples, 2);
    assert_eq!(engine.snapshot().position_samples, 2);
    engine.play();
    let mut output = [0.0; 3];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.75, 0.25, -0.5]);
    engine.play(); // PLAY while already playing must not retrigger a Loop.
    engine.process(&[], &mut output);
    assert_eq!(output, [0.75, 0.25, -0.5]);
}

#[test]
fn empty_stop_and_play_do_not_create_audio_or_a_cycle() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.stop_track();
    engine.play();
    engine.stop_transport();
    engine.record();
    engine.stop_track(); // A capture with no samples remains Empty.
    assert_eq!(engine.snapshot().state, TrackState::Empty);
    assert_eq!(engine.snapshot().cycle_length_samples, 0);
    assert!(!engine.snapshot().transport_running);
    assert!(engine.snapshot().can_record);
}

#[test]
fn sixty_second_limit_is_sample_exact_at_multiple_sample_rates() {
    for sample_rate in [8_000, 44_100, 48_000, 96_000] {
        let mut engine = LoopEngine::with_sample_rate(sample_rate);
        let limit = sample_rate as usize * 60;
        assert_eq!(engine.snapshot().capacity_samples, limit);
        engine.record();
        let input = vec![0.25; limit - 1];
        let mut output = vec![9.0; limit - 1];
        engine.process(&input, &mut output);
        assert!(output.iter().all(|&sample| sample == 0.0));
        assert_eq!(engine.snapshot().state, TrackState::Recording);
        assert_eq!(engine.snapshot().length_samples, limit - 1);
        assert!(!engine.snapshot().transport_running);
        let mut boundary = [9.0; 2];
        engine.process(&[0.75, 0.9], &mut boundary);
        assert_eq!(boundary, [0.0, 0.25]);
        assert_eq!(engine.snapshot().state, TrackState::Playing);
        assert_eq!(engine.snapshot().cycle_length_samples, limit);
        assert_eq!(engine.snapshot().length_samples, limit);
        assert_eq!(engine.snapshot().transport_position_samples, 1);
        // Last recorded sample survives at the end of the first replay cycle.
        engine.process(&[], &mut output);
        assert_eq!(output[limit - 2], 0.75);
        assert_eq!(engine.snapshot().position_samples, 0);
    }
}
