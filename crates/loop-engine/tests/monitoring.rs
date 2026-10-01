use loop_engine::LoopEngine;

#[test]
fn a_new_session_does_not_output_live_input() {
    let mut engine = LoopEngine::new();
    let mut output = [9.0; 3];
    engine.process(&[1.0, 0.5, -0.5], &mut output);
    assert_eq!(output, [0.0; 3]);
}

#[test]
fn monitoring_can_be_enabled_and_disabled_without_retaining_live_audio() {
    let mut engine = LoopEngine::new();
    let mut output = [0.0; 3];
    engine.set_monitoring(true);
    engine.process(&[1.0, 0.5, -0.5], &mut output);
    assert_eq!(output, [1.0, 0.5, -0.5]);
    engine.set_monitoring(false);
    engine.process(&[1.0, 0.5, -0.5], &mut output);
    assert_eq!(output, [0.0; 3]);
}
