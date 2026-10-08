use loop_engine::LoopEngine;

#[test]
fn export_retains_completed_samples_without_changing_playback() {
    let mut engine = LoopEngine::with_capacity(16);
    engine.record(0);
    engine.process(&[0.25, -0.5, 0.75], &mut [0.0; 3]);
    engine.record(0);
    let revision = engine.recording_revision(0);
    let mut samples = [0.0; 3];
    assert!(engine.read_recording(0, revision, 0, &mut samples));
    assert_eq!(samples, [0.25, -0.5, 0.75]);
    let mut output = [0.0; 3];
    engine.process(&[], &mut output);
    assert_eq!(output, samples);
    engine.clear(0);
    assert!(!engine.read_recording(0, revision, 0, &mut samples));
}

#[test]
fn export_preserves_phase_silence_and_rejects_unfinished_or_mutated_audio() {
    let mut engine = LoopEngine::with_capacity(16);
    engine.record(0);
    engine.process(&[0.1; 4], &mut [0.0; 4]);
    engine.record(0);
    engine.process(&[], &mut [0.0; 2]);
    engine.record(1);
    engine.process(&[0.25], &mut [0.0]);
    let revision = engine.recording_revision(1);
    assert!(!engine.read_recording(1, revision, 0, &mut [0.0; 4]));
    engine.record(1);
    let mut samples = [1.0; 4];
    assert!(engine.read_recording(1, revision, 0, &mut samples));
    assert_eq!(samples, [0.0, 0.0, 0.25, 0.0]);
    engine.record(1);
    engine.process(&[2.0], &mut [0.0]);
    engine.record(1);
    assert!(!engine.read_recording(1, revision, 0, &mut samples));
    assert!(!engine.read_recording(1, engine.recording_revision(1), 0, &mut [0.0; 2049]));
    assert!(!engine.read_recording(1, engine.recording_revision(1), 4, &mut [0.0]));
}
