use yona_rust_search::{make_snippets, SearchHighlight};

#[test]
fn snippets_follow_legacy_korean_window_boundaries() {
    let snippets = make_snippets(
        "자동링크로 바꿀 수 있는 url은 자동링크처럼 보여주기 이슈 본문이나 댓글 등에 Yobi의 어떤 페이지에 대한 링크를 넣었을 때, 이를 렌더링해서 보여줄 때는 자동링크로 보여주면 좋을 것 같습니다. 예를 들어 `http://yobi.navercorp.com/dlab/hive/issue/1478`를 자동으로 #1478 로 보여준다거나, `http://yobi.navercorp.com/dlab/hive/commit/2f0ef4c0bbe535eb3475b0e7cdaadf86add6f220?branch=master`는 2f0ef4c로 보여주는 식입니다.",
        "이슈",
        10,
    );

    assert_eq!(snippets.len(), 1);
    assert_eq!(snippets[0].text, "링크처럼 보여주기 이슈 본문이나 댓글 등");
    assert_eq!(
        snippets[0].highlights,
        vec![SearchHighlight { start: 10, end: 12 }]
    );
}

#[test]
fn snippets_merge_legacy_overlap_windows() {
    let snippets = make_snippets(
        "#1477 마일스톤 이슈리스트 화면 개선 #1466 이슈에서 응준님께서 말씀주신 내용을 처리하고자 의견을 기다립니다. 1. github에서처럼 마일스톤내의 이슈검색시, 이슈리스트로 해당마일스톤을 검색필터로 선정하여 이동 * 별다른 개발없이 링크만 바꿔주면됨 * back버튼으로 마일스톤 리스트화면으로 이동이 가능하며, 이슈리스트의 검색기능을 그대로 활용가능 2. 마일스톤내 이슈화면에 검색기능을 추가 * 추가기능을 개발하다보면, 이슈리스트화면과 같아짐 * 향후, 마일스톤내 이슈페이지만의 기능을 넣고자 한다면, 이 방법이 나아보임 그럼 의견주시면 주신대로 작업진행하도록 하겠습니다~",
        "이슈",
        40,
    );

    assert_eq!(snippets.len(), 2);
    assert_eq!(
        snippets[0].text,
        "#1477 마일스톤 이슈리스트 화면 개선 #1466 이슈에서 응준님께서 말씀주신 내용을 처리하고자 의견을 기다립니다. 1. github에서처럼 마일스톤내의 이슈검색시, 이슈리스트로 해당마일스톤을 검색필터로 선정하여 이동 * 별다른 개발없이 링크"
    );
    assert_eq!(
        snippets[1].text,
        "바꿔주면됨 * back버튼으로 마일스톤 리스트화면으로 이동이 가능하며, 이슈리스트의 검색기능을 그대로 활용가능 2. 마일스톤내 이슈화면에 검색기능을 추가 * 추가기능을 개발하다보면, 이슈리스트화면과 같아짐 * 향후, 마일스톤내 이슈페이지만의 기능을 넣고자 한다면, 이 방법이 나아보임 그럼 의견주시면 주"
    );
}
