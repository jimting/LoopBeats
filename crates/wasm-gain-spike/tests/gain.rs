use wasm_gain_spike::apply_gain;

#[test]
fn gain_scales_a_known_audio_block() {
    let mut output = [0.0; 3];
    apply_gain(&[1.0, 0.5, -0.5], &mut output, 0.5);
    assert_eq!(output, [0.5, 0.25, -0.25]);
}
