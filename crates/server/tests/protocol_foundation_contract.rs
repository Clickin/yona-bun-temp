use buffa::Message;
use yona_rust_pilot_server::generated::yona::pilot::v1::ReadCurrentSessionRequest;

#[test]
fn server_reexports_generated_protocol_snapshot() {
    let request = ReadCurrentSessionRequest::default();

    assert_eq!(
        ReadCurrentSessionRequest::TYPE_URL,
        "type.googleapis.com/yona.pilot.v1.ReadCurrentSessionRequest"
    );
    assert_eq!(request.cached_size(), 0);
}
