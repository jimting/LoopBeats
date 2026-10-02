use loop_engine::{LoopEngine, TrackState};

#[test]
fn second_capture_wraps_once_and_automatically_plays_in_shared_phase() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.1; 4], &mut [0.0; 4]);
    engine.record(0);
    engine.process(&[], &mut [0.0; 2]);
    engine.record(1);
    assert!(!engine.snapshot().tracks[0].can_record);
    let mut output = [0.0; 5];
    engine.process(&[0.2, 0.3, 0.4, 0.5, 0.9], &mut output);
    assert_eq!(output, [0.1, 0.1, 0.1, 0.1, 0.3]);
    let snapshot = engine.snapshot();
    assert_eq!(snapshot.tracks[1].state, TrackState::Playing);
    assert_eq!(snapshot.tracks[1].length_samples, 4);
    assert_eq!(snapshot.tracks[1].captured_samples, 4);
    assert_eq!(snapshot.transport_position_samples, 7);
    engine.stop_track(0);
    engine.process(&[], &mut output[..4]);
    assert_eq!(&output[..4], &[0.3, 0.4, 0.5, 0.2]);
}

#[test]
fn early_rec_completion_preserves_two_to_three_second_phrase_and_silence_after_retry() {
    let mut engine = LoopEngine::with_sample_rate(8_000);
    engine.record(0);
    engine.process(&[], &mut vec![0.0; 32_000]); // Four-second cycle.
    engine.record(0);
    engine.process(&[], &mut vec![0.0; 16_000]); // Start at second two.
    engine.record(1);
    engine.process(&vec![0.75; 12_000], &mut vec![0.0; 12_000]);
    engine.stop_transport(); // Discard this unfinished synchronized capture.
    assert_eq!(engine.snapshot().tracks[1].state, TrackState::Empty);
    engine.play(0);
    engine.process(&[], &mut vec![0.0; 16_000]);
    engine.record(1);
    engine.process(&vec![0.25; 8_000], &mut vec![0.0; 8_000]);
    engine.record(1); // Finish early at second three; retain full four seconds.
    assert_eq!(engine.snapshot().tracks[1].length_samples, 32_000);
    let mut output = vec![9.0; 32_000];
    engine.process(&[], &mut output);
    // Current phase is second three: 3–4, 0–2 silent, then 2–3 phrase.
    assert!(output[..24_000].iter().all(|&sample| sample == 0.0));
    assert!(output[24_000..].iter().all(|&sample| sample == 0.25));
}

#[test]
fn track_stop_retains_partial_wraparound_and_play_joins_without_restarting_other_track() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.1; 4], &mut [0.0; 4]);
    engine.record(0);
    engine.process(&[], &mut [0.0; 3]);
    engine.record(1);
    engine.process(&[0.25, 0.5], &mut [0.0; 2]); // Positions 3 and 0.
    engine.stop_track(1);
    let snapshot = engine.snapshot();
    assert_eq!(snapshot.tracks[1].state, TrackState::Stopped);
    assert_eq!(snapshot.tracks[1].length_samples, 4);
    assert_eq!(snapshot.transport_position_samples, 5);
    assert!(snapshot.transport_running);
    let mut output = [0.0; 4];
    engine.process(&[], &mut output);
    assert_eq!(output, [0.1; 4]);
    engine.play(1); // Current phase 1, not zero.
    engine.process(&[], &mut output);
    assert_eq!(output, [0.1, 0.1, 0.35, 0.6]);
    engine.stop_transport();
    engine.play(1);
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Stopped);
    engine.process(&[], &mut output);
    assert_eq!(output, [0.5, 0.0, 0.0, 0.25]);
}

#[test]
fn either_track_can_establish_cycle_and_capture_exclusion_is_engine_enforced() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(1);
    assert!(!engine.snapshot().tracks[0].can_record);
    assert!(engine.snapshot().tracks[1].can_record);
    engine.record(0); // Stale/competing REC cannot steal capture ownership.
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Empty);
    engine.process(&[0.1; 4], &mut [0.0; 4]);
    engine.record(1);
    engine.record(0);
    let mut output = [0.0; 4];
    engine.process(&[0.2; 4], &mut output);
    assert_eq!(output, [0.1; 4]); // Track 2 plays during Track 1's capture.
    assert_eq!(engine.snapshot().tracks[0].state, TrackState::Playing);
    engine.process(&[], &mut output);
    assert_eq!(output, [0.3; 4]);
    engine.record(2);
    engine.play(usize::MAX);
    engine.stop_track(2);
    assert_eq!(engine.snapshot().tracks[0].length_samples, 4);
}

#[test]
fn two_tracks_remain_in_phase_across_thousands_of_cycles_and_output_is_protected() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.75, -0.75, 0.25], &mut [0.0; 3]);
    engine.record(0);
    engine.process(&[], &mut [0.0; 1]);
    engine.record(1);
    engine.process(&[-0.75, 0.25, 0.75], &mut [0.0; 3]);
    let mut output = [0.0; 7];
    for _ in 0..3000 {
        engine.process(&[], &mut output);
    }
    assert_eq!(output, [1.0, -1.0, 0.5, 1.0, -1.0, 0.5, 1.0]);
    let snapshot = engine.snapshot();
    assert_eq!(snapshot.transport_position_samples, 21004);
    assert_eq!(snapshot.tracks[0].position_samples, 1);
    assert_eq!(snapshot.tracks[1].position_samples, 1);
}

#[test]
fn stopped_transport_disables_empty_rec_and_zero_sample_completion_remains_empty() {
    let mut engine = LoopEngine::with_capacity(8);
    engine.record(0);
    engine.process(&[0.25; 4], &mut [0.0; 4]);
    engine.stop_track(0);
    assert!(!engine.snapshot().tracks[1].can_record);
    engine.record(1);
    assert_eq!(engine.snapshot().tracks[1].state, TrackState::Empty);
    engine.play(0);
    engine.record(1);
    engine.record(1);
    assert_eq!(engine.snapshot().tracks[1].state, TrackState::Empty);
    assert_eq!(engine.snapshot().cycle_length_samples, 4);
    assert!(engine.snapshot().transport_running);
}
