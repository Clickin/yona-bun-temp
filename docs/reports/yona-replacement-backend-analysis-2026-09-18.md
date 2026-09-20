# Yona 1.16 대체 가능성: main·현재 브랜치 통합 분석

> Status: source/evidence analysis snapshot. 실행 범위와 이전 정책은 후속 사용자 승인에 따른 [실행 계획](../plans/2026-09-18-yona-replacement-execution.md)을 따른다. 대용량은 DB 직접 연결 migrator, 소규모 SI 프로젝트의 기존 사내 프로젝트 병합은 API migrator로 분리한다. 아래 G–H의 이전 경로 추천과 조건부 범위는 해당 계획으로 구체화됐으며, 이 문서는 구현 완료 증거가 아니다.

- 대상: `main` = `7f03d4fac`, 현재 `feature/pull-request` = `c8b27212b`.
- 범위: 인증·ACL, 이슈·게시판·검색·알림, 외부 연동, 프런트엔드, VCS, 이전·배포 및 최종 인수 증거. A–D는 백엔드 상세, E–H는 main agent의 통합 분석이다.
- 방법: 두 커밋의 diff와 `git show`, 현재 구현, `yona-original/` 원본 및 기존 실행 artifact를 대조했다. 기존 `buildVerdict`를 실제 호출해 저장된 sweep을 재집계했다. 제품 코드 수정, 서버 실행, 공격 재현, 새 테스트·빌드·린트는 수행하지 않았다.
- 판정 용어: **소스 확정 결함**은 실제 런타임 경로에 누락/불일치가 확인됐다는 뜻이며 이번 조사에서 동작을 실행 재현했다는 뜻은 아니다. **증거 공백**은 기능 미구현과 구분한다. 기존 테스트를 인용한 곳은 테스트 내용의 근거이지 이번 실행 통과 주장이 아니다.
- 파일:행은 별도 표시가 없으면 현재 checkout 기준이다. `7f03d4fac:path:행`은 main에서 직접 읽은 위치다.

## 요약

현재 브랜치는 main의 첨부파일 ACL·공유 파일 수명, 이슈 수정/발행 알림, 게시판 댓글의 오래된 내용 덮어쓰기 문제를 일부 고쳤다. 따라서 main과 현재를 동일한 완료 상태로 볼 수 없다. 그러나 **두 브랜치에 공통으로 남은 OAuth 인증 우회·예측 가능한 OAuth 계정 비밀번호, 이메일 첨부파일 소실, 게시판 무알림 수정 누락, 검색 결과 정렬 차이**가 소스에서 확인된다. 과거의 “bounded slice complete” 또는 fixture 테스트 성공만으로 전체 대체 가능 판정을 내릴 수 없다.

| 우선순위 | 기능 | main | 현재 | 판정 |
|---|---|---|---|---|
| P0 | OAuth 공급자 신원 검증 | 쿼리 신원 shortcut 노출 | 동일 | 소스 확정 인증 결함 |
| P0 | OAuth 신규 계정의 로컬 비밀번호 | 공개 공급자 ID로 결정됨 | 동일 | 소스 확정 인증 결함 |
| P1 | 수신 메일의 첨부파일·인라인 이미지 | 정규화 과정에서 소실 | 동일 | 소스 확정 기능 누락 |
| P1 | 게시글 작성자의 무알림 수정 | 옵션 미수용, 변경 알림 생성 | 동일 | 소스 확정 기능 누락 |
| P2 | 검색 결과 순서 | legacy 순서보다 relevance 우선 | 동일 | 소스 확정 사용자 결과 차이 |
| P1 | 첨부파일 ACL·공유 blob 보존 | 컨테이너 권한/참조 수명 누락 | 관련 처리 및 계약 테스트 추가 | main 잔존, 현재 소스상 수정 |
| P1/P2 | 이슈 알림 제어·게시판 댓글 충돌 | 관련 제어 없음 | 관련 처리 및 계약 테스트 추가 | main 잔존, 현재 소스상 수정 |
| 환경 검증 | LDAP·SMTP·HTTPS webhook·mailbox 수신 | 실제 구현은 있으나 제한된 증거 | 핵심 구현 동일 | 외부 서비스 검증 공백 |

## A. 두 브랜치에 공통으로 남은 확정 결함

### B-01 / P0 — OAuth의 테스트용 쿼리 신원이 실제 로그인 경로에서 신뢰됨

**제품 기능:** GitHub/Google 등 공급자가 확인한 신원으로만 로그인·계정 연결해야 한다.

**main 대 현재:** 동일하다. `auth.rs`의 이번 branch diff는 빈 줄 삭제뿐이며, main에서도 `7f03d4fac:crates/server/src/routes/auth.rs:1402-1410,1438-1465`로 shortcut → 계정 연결 → 세션 발급 경로를 직접 확인했다.

**legacy 근거:** `yona-original/app/controllers/Application.java:65-66`은 `authenticate(provider)`를 호출한다. `yona-original/app/controllers/UserApp.java:1291-1309`는 `PlayAuthenticate.getUser(session)`로 얻은 인증 신원에 대응하는 `UserCredential`을 기준으로 로컬 계정을 연결한다.

**현재 근거와 조건:**

- `crates/server/src/routes/auth.rs:1125-1142`: 공급자가 enabled 목록에 있고 provider 설정에 `client_id`, `authorization_url`이 있어야 이 경로가 열린다. 미설정 서버 전체에 무조건 적용되는 취약점으로 서술하면 안 된다.
- `auth.rs:1145-1164`: `providerUserId`/`provider_user_id`/`id`와 `email` 쿼리만으로 공급자 신원을 만든다. 주석은 test/dev지만 함수와 호출은 test-only 경계가 아니다.
- `auth.rs:1309-1344,1358-1390`: 공개 시작 요청이 state와 쿠키를 발급하고 callback은 그 일치 여부를 검사한다. 이는 요청의 상관관계 확인이지 공급자 신원 증명이 아니다.
- `auth.rs:1401-1403`: 쿼리 신원이 있으면 `code`를 통한 공급자 token/userinfo 교환보다 먼저 선택된다.
- `crates/persistence/src/repo/user.rs:294-320`: 기존 provider ID에 연결된 사용자 또는 쿼리의 email로 찾은 로컬 사용자를 반환/연결한다. `auth.rs:1461-1464`가 그 사용자 세션을 발급한다. 따라서 이미 연결된 공급자 ID 또는 대상 로컬 email을 아는 경우의 계정 탈취 경로가 성립한다. 신규 계정만 만드는 문제가 아니다.
- `crates/server/tests/auth_workspace_contract.rs:1568`의 `legacy_oauth_callback_identity_hook_works_with_valid_state`는 잘못된 성공 계약을 명시적으로 보호한다. state 없는 호출 차단 테스트만으로 이 결함이 닫히지 않는다.

**최소 종료 조치:** 프로덕션 callback에서 쿼리 신원 shortcut을 제거하고 공급자 code exchange 결과만 사용한다. 기존 로컬 HTTP provider stub으로 테스트를 옮기면 별도의 런타임 test-auth 설정을 만들 필요가 없다.

**수용 확인:** 공급자 start에서 얻은 올바른 state가 있어도 provider ID/email만 제출하면 인증 세션·linked account가 생성되지 않아야 한다. 유효하지 않은 code에 신원 쿼리를 함께 넣어도 실패해야 한다. 정상 code 교환은 기존 사용자 연결과 신규 사용자 생성 모두 성공해야 한다. 이번 조사에서는 네트워크 공격을 실행하지 않았다.

### B-02 / P0 — OAuth로 새로 생성한 계정의 로컬 비밀번호가 예측 가능

**제품 기능:** OAuth 계정에 사용자가 설정하지 않은, 외부인이 계산 가능한 로컬 비밀번호가 생기면 안 된다.

**main 대 현재:** 둘 다 존재한다. main은 `7f03d4fac:crates/server/src/routes/auth.rs:1439`, 현재는 `crates/server/src/routes/auth.rs:1438`이다. 관련 persistence 사용자 생성 로직은 branch 간 변경이 없다.

**legacy 근거:** `yona-original/app/controllers/UserApp.java:434-435,454-475`, 특히 `468-469`는 OAuth 사용자의 비밀번호를 `SecureRandomNumberGenerator`로 생성한다.

**현재 근거:**

1. `auth.rs:1438`에서 `bcrypt("{provider}:{provider_user_id}:oauth")`를 생성한다. bcrypt의 무작위 salt는 이미 정해진 평문 비밀번호를 비밀로 만들어 주지 않는다.
2. `crates/persistence/src/repo/user.rs:306-320`에서 **신규** OAuth 사용자에게 이 hash를 저장한다. 기존 로컬 계정을 연결할 때 기존 비밀번호를 덮어쓴다는 주장은 하지 않는다.
3. `auth.rs:394-411,442-457`의 일반 로컬 로그인은 이 계정을 조회하고 bcrypt 일치 시 성공한다.

**영향 조건:** OAuth로 새로 만들어졌고 이후 비밀번호가 변경되지 않은 계정, provider ID를 알 수 있고 로컬 비밀번호 인증이 사용 가능한 경로/구성이다. B-01 shortcut을 삭제해도 정상 OAuth 가입에서 이 문제가 남는다.

**최소 종료 조치:** 예측 불가능한 임의 비밀번호로 생성하거나 해당 계정에 로컬 비밀번호 인증이 가능한 상태를 사용자 비밀번호 설정 전까지 만들지 않는다. 이미 이 규칙으로 생성된 계정의 기존 hash도 처리해야 한다. 단순히 이후 가입만 수정하면 이미 생성된 계정은 안전해지지 않는다.

**수용 확인:** 정상 provider 교환으로 신규 계정을 만든 뒤 기존 결정식 비밀번호로 로컬 로그인이 실패해야 하며 OAuth 로그인은 성공해야 한다. 기존 로컬 계정의 정상 비밀번호는 공급자 연결 후 보존돼야 한다. 소스 확정, 런타임 미실행이다.

### B-03 / P1 — 메일로 만든 이슈·댓글에서 첨부파일과 CID 이미지가 사라짐

**제품 기능:** 이메일 본문뿐 아니라 첨부파일·인라인 이미지도 이슈와 댓글에 남아야 한다.

**main 대 현재:** 동일하다. `crates/integrations/src/lib.rs`, `crates/server/src/mailbox.rs`, `crates/persistence/src/repo/mailbox.rs`는 branch 간 변경이 없다. main의 `integrations/src/lib.rs:666-685`도 직접 읽었다.

**legacy 근거:**

- `yona-original/app/mailbox/CreationViaEmail.java:82-97`: 댓글 생성 후 `saveAttachments`와 HTML CID 치환.
- 같은 파일 `176-196`: 이슈에도 첨부 저장·CID 치환·OriginalEmail 기록.
- 같은 파일 `309-311`: filename이 있는 MIME part를 첨부파일로 분류한다.

**현재 근거:**

- `crates/integrations/src/lib.rs:408-421`에는 MIME part와 `attachments` 추출 결과가 있다. 그러나 part 모델은 파일명/원본 binary bytes를 보존하는 모델이 아니며 body가 `String`이다.
- 같은 파일 `666-685`는 `content.attachments`를 `MailboxNormalizedMessage`로 전달하지 않는다. 정규화 모델 자체도 `487-495`에 첨부 필드가 없다.
- `crates/server/src/mailbox.rs:10-19`는 제목·본문·발신자·thread ID만 persistence로 전달한다. 저장한 첨부파일로 `cid:`를 바꾸는 단계가 없다.
- 일반 `multipart/mixed`의 비 text part는 `integrations/src/lib.rs:688-710`에서 빈 content가 된다. 관련 MIME part를 추출해도 이후 정규화에서 다시 버려진다.

**최소 종료 조치:** 기존 이메일 처리 경로에 MIME 파일명·bytes·content ID를 끝까지 전달하고 생성한 리소스에 기존 첨부 저장 경로로 묶은 뒤 CID를 실제 파일 URL로 바꾼다. IMAP 설정 키를 옛것과 같게 만드는 것으로는 이 기능 누락이 해결되지 않는다.

**수용 확인:** 같은 실제 RFC822 메일을 두 구현에 넣어 이슈 및 답장 댓글의 첨부 파일명·원본 bytes·CID 이미지와 접근권한을 비교한다. UTF-8 본문만 있는 fixture의 생성 성공으로 대체하면 안 된다. `crates/server/tests/mailbox_contract.rs:749-850`의 polling 검증은 fake shell fetcher가 text/plain 두 통을 반환하는 계약이다.

### B-04 / P1 — 게시글 작성자의 “알림 없이 수정” 선택을 백엔드가 수용하지 않음

**제품 기능:** 작성자가 알림 발송을 끄고 게시글을 수정할 수 있어야 하며, 타인이 수정하는 경우의 알림 규칙도 보존돼야 한다.

**main 대 현재:** 동일하다. main의 `7f03d4fac:crates/server/src/routes/boards.rs:49-70,1739-1747`와 현재 `boards.rs:50-71,1742-1750`에는 해당 옵션이 없다. `crates/persistence/src/repo/posting.rs`는 branch 간 변경이 없다. 현재 브랜치의 이슈 알림 수정이 게시글까지 고친 것은 아니다.

**legacy 근거:** `yona-original/app/controllers/BoardApp.java:355-365`는 `isSelectedToSendNotificationMail() || !original.isAuthoredBy(currentUser)`일 때만 `NotificationEvent.afterUpdatePosting`을 호출한다. 선택값은 `AbstractPostingApp.java:274-281`에서 읽는다.

**현재 근거:**

- `crates/server/src/routes/boards.rs:50-71`: `RestPostMutationBody`가 발송 여부를 받지 않는다.
- `crates/persistence/src/repo/posting.rs:433-483`: 게시글 수정은 항상 `sync_posting_mentions_and_notify(... POSTING_BODY_CHANGED ...)`를 호출한다.
- `crates/persistence/src/repo/mention_sync.rs:18-47`: watcher/mention 수신자를 계산하고 notification event를 생성한다. 작성자 선택에 따른 조건이 없다.

**최소 종료 조치:** 기존 게시글 REST 수정 경계에 발송 의사를 전달하고, 작성자와 비작성자 규칙을 notification 생성에 적용한다. 언급 관계 갱신과 알림 생성은 필요한 만큼만 분리한다.

**수용 확인:** 다른 watcher가 있는 동일한 게시글을 작성자-발송 off, 작성자-on, 권한 있는 비작성자-off로 각각 수정한다. 내용 저장은 세 경우 모두 성공하고 알림/메일 수신 결과는 legacy와 같아야 한다. fixture outbox뿐 아니라 설정된 delivery 경로와 사용자 알림함까지 확인한다.

### B-05 / P2 — 검색의 결과 순서가 legacy와 다르며 native 검색 결과 포함 범위도 다름

**제품 기능:** 같은 keyword·권한·데이터에서 사용자가 보는 결과 순서, 결과 수와 페이지가 같아야 한다. 이는 옛 API URL 호환성과 무관하다.

**main 대 현재:** 동일하다. 검색 crate와 persistence search/common 파일은 branch 간 변경이 없다. main `7f03d4fac:crates/persistence/src/repo/common.rs:81-85`에서도 동일한 relevance sort를 확인했다.

**legacy 근거:** `yona-original/app/models/Search.java:120-127,163-172`는 이슈를 createdDate 내림차순으로, `361-368`은 사용자를 name 오름차순으로 정렬한다. `524`의 프로젝트 name 정렬, `541`의 milestone dueDate 정렬, `600-601` 등의 댓글 createdDate 정렬도 각 타입 기본 순서다. `760-765`는 각 검색 필드에 `icontains(keyword)`를 적용한다.

**현재 근거:**

- `crates/persistence/src/repo/search.rs:153-187,221`에서 legacy 순서로 읽은 뒤 relevance 점수를 붙인다.
- `crates/persistence/src/repo/common.rs:81-85`는 점수 내림차순을 우선하고 legacy 순서는 동점일 때만 보존한다.
- `crates/search/src/lib.rs:107-124`는 제목 hit에 100 가중치를 준다. 오래된 제목 hit가 더 최신 본문 hit보다 앞에 나오는 규칙이다. 같은 파일 `303-324`의 테스트는 바로 이 non-legacy 우선순위를 기대한다.
- `crates/persistence/src/repo/search.rs:939-942`는 `native_match || literal_match`로 포함 여부를 판정한다. FTS를 사용하는 사실 자체는 문제가 아니지만, 이 OR는 native tokenization만 일치하는 행도 최종 결과로 허용한다. 그 추가 결과의 실제 발생 범위는 dialect별 실행 증거가 필요하다.

**최소 종료 조치:** 기본 순서를 legacy 타입별 정렬로 맞추고 native 후보가 legacy matching을 바꾸지 않게 한다. 새로운 relevance 개선을 유지하려면 제품 변경에 대한 명시적 결정이 필요하며 “내부 구현 차이”로 닫을 수 없다. 외부 검색 엔진을 새로 만들 필요는 없다.

**수용 확인:** 최신 본문 hit와 오래된 제목 hit, 반복 hit 수가 다른 행, 다중 단어/구두점/공백/한글 검색을 넣어 global/project/organization의 결과 ID·순서·count·페이지 경계를 비교한다. 정렬 차이는 소스 확정이며, native-only 추가 행의 실제 dialect별 목록은 이번 조사에서 실행하지 않았다.

## B. main에는 남지만 현재 브랜치에서 구현이 추가된 항목

다음은 현재의 미구현 목록에 다시 올릴 항목이 아니다. 다만 현재 소스와 테스트 추가가 main에 존재하는 것은 아니며, 해당 snapshot에서 테스트를 실행했다는 주장도 아니다.

| 기능 | legacy 근거 | main 결함 근거 | 현재 처리 / 남은 종료 확인 |
|---|---|---|---|
| 첨부 READ가 컨테이너 ACL·이슈 공유자를 상속 | `yona-original/app/utils/AccessControl.java:250-262`, `AttachmentApp.java:142-144` | `7f03d4fac:crates/server/src/routes/files.rs:171-211`은 issue/comment 등을 모두 project READ로만 판단. 비공개 프로젝트의 이슈 공유자가 첨부를 읽는 경로가 막힘 | `crates/server/src/routes/files.rs:319-371`은 `read_issue_access`를 사용. `crates/server/tests/attachment_acl_contract.rs:645-715`에 private issue sharer 성공, outsider 실패, sharer 삭제 실패 계약. main에 반영하거나 현재 snapshot을 기준으로 동일 시나리오 확인 |
| 첨부 DELETE가 uploader가 아니라 컨테이너 UPDATE 권한을 따름 | `AccessControl.java:260-262`, `AttachmentApp.java:193-194` | `7f03d4fac:crates/persistence/src/repo/attachment.rs:687-695`는 uploader 또는 admin 여부로만 허용. 권한을 잃은 uploader가 삭제 가능하고, 정당한 관리자 편집 경로가 막힐 수 있음 | 현재 `files.rs:891-913`, `attachment.rs:1004-1009`에 container update 판단. 계약 `attachment_acl_contract.rs:797-859`. uploader-only 거부와 manager/admin 성공을 확인 |
| 같은 blob을 참조하는 다른 첨부파일 보존 | `yona-original/app/models/Attachment.java:311-324`는 마지막 hash 참조가 없어야 원본 파일 삭제 | `7f03d4fac:crates/server/src/routes/files.rs:505-510`는 한 첨부 삭제 때 blob을 무조건 제거 | 현재 `crates/persistence/src/repo/attachment.rs:1012-1035`가 남은 hash 참조를 확인하고 `files.rs:916-925`가 결과에 따라 파일 삭제. 계약 `attachment_acl_contract.rs:244-350,502-642`. 두 참조 중 하나만 삭제한 뒤 나머지 다운로드 bytes 유지, 마지막 삭제 시 정리를 확인 |
| 이슈 수정의 무알림 선택과 draft 발행의 NEW_ISSUE | `yona-original/app/controllers/IssueApp.java:820-834` | `7f03d4fac:crates/server/src/routes/issues.rs:3535-3560`는 발송 옵션 없이 수정 후 BODY_CHANGED webhook을 보냄 | 현재 `issues.rs:3536-3602`, `crates/persistence/src/repo/issue_mutation.rs:305-346`. 계약 `crates/server/tests/issue_core_contract.rs:474-501,771-772`. 작성자 off/on, 비작성자 off, draft 저장/발행을 분리 확인. 게시글(B-04)은 여전히 별개 |
| 게시판 댓글의 stale original 덮어쓰기 차단 | `yona-original/app/controllers/api/BoardApi.java:221-226` | branch diff의 main `boards.rs:2015-2036`에는 original 비교 없이 업데이트 호출 | 현재 `crates/server/src/routes/boards.rs:2043-2062`에 원본 비교·충돌 응답. 계약 `crates/server/tests/board_contract.rs:1196-1218`. 두 편집자가 순차 수정했을 때 오래된 original의 저장이 거절되고 최신 내용 보존을 확인. legacy route 모양을 복제할 필요는 없음 |

알림 상대시간의 언어 처리도 현재 `crates/server/src/routes/notifications.rs:406-429`에 추가됐다. 이것은 현재 변경 사항이지 공통 “알림 전체 미구현”의 근거가 아니다. 정확한 화면 결과는 프런트엔드 담당 조사와 합쳐 판정한다.

## C. 구현과 실환경 증거를 구분해야 하는 연동

| 기능 | 실제 구현과 legacy 근거 | 확인한 증거의 한계 | 최소 종료 조치 / 수용 확인 |
|---|---|---|---|
| LDAP | legacy `yona-original/app/utils/LdapService.java:108-116`; 현재 `crates/server/src/ldap.rs:43-79`는 실제 LDAP connect/simple bind/subtree search. `auth.rs:519-534`는 fixture가 없으면 실제 connector 선택. 해당 구현은 main/current 동일 | `ldap.rs:215-258`의 connector boundary 테스트는 `RecordingConnector`; `auth_workspace_contract.rs:3448,3504,3587`은 fixture users. `docs/provenance/parity-reclassification-2026-09.md:173-176`도 외부 directory 미검증을 명시 | 운영 directory 또는 같은 정책의 통합 환경에서 bind/search, 신규 사용자 생성, 기존 사용자 속성·guest 분류 갱신, 실패 시 local fallback의 의도된 동작 확인. LDAP 자체가 미구현이라고 쓰지 않음 |
| SMTP 알림·인증 메일 | legacy `yona-original/app/models/NotificationMail.java:562-563`; 현재 `crates/integrations/src/lib.rs:933-955`는 실제 SMTP transport. 구현 main/current 동일 | 같은 파일 `919-930`은 SMTP disabled이면 메모리 outbox에 기록하고 성공. 과거 paired sweep은 SMTP catch-box (`parity-reclassification-2026-09.md:159-160`), 외부 relay는 `178`의 미검증 항목 | 실제 사용할 TLS/auth/relay에서 인증 메일과 알림 메일의 수신·회신 주소·수신자 제한을 확인. catch-box 성공을 외부 relay 성공으로 바꾸어 적지 않음 |
| HTTPS webhook / Slack·Chat 형식 | legacy `yona-original/app/models/Webhook.java:199-212,342-355`; 현재 `crates/integrations/src/lib.rs:1038-1041,1119-1153`의 HTTP/HTTPS 실행 경로와 응답 처리. 핵심 구현 main/current 동일 | `crates/integrations/tests/webhook_contract.rs:71-128`의 HTTPS 테스트는 fake curl shell이 고정 HTTP 200을 출력. disabled이면 `integrations/src/lib.rs:1025-1035`의 메모리 outbox로 성공 가능. 해당 테스트만으로 실제 TLS endpoint 전달 증명 불가 | 실제 사용할 endpoint로 이슈/댓글 이벤트 한 건을 전송하고 요청 body/header, 수신 성공, Chat thread 응답 활용 확인. 외부 전달이 미구현이라는 뜻은 아님 |
| mailbox 외부 수신 | legacy `yona-original/app/mailbox/MailboxService.java:94-114`는 IMAP 직접 연결. 현재 `crates/server/src/mailbox.rs:154-181`는 설정한 command의 NUL 구분 RFC822 stdout을 처리. main/current 동일 | `mailbox_contract.rs:774-818`은 fake shell fetcher. 실제 mailbox 접속·증분 수신·중복/재시작 동작의 증거가 아님. 첨부 소실은 이 표의 증거 공백이 아니라 B-03 확정 누락 | 사용할 fetch command로 실제 메일 도착→이슈 생성→답장 댓글→재실행 중복 방지까지 확인. 직접 IMAP 라이브러리로 바꿔야만 parity라는 주장은 하지 않음. command 방식이 충분하면 그것으로 종료 가능 |
| OAuth 정상 연동 | provider token/userinfo HTTP 교환은 `crates/server/src/routes/auth.rs:1167-1262`에 구현. 로컬 provider 서버는 `auth_workspace_contract.rs:188-304`, GitHub/Google 교환 계약은 `1081,1149` | 문서가 충돌: `auth-deferred-oauth-ldap.md:11-13`은 과거 live profile 문제, `human-verification-2026-08.md:20`은 사용자가 live round trip 완료를 보고, `parity-reclassification-2026-09.md:173-174`는 해당 sweep의 credentials 부재를 기록 | 과거 live 실패를 현재 재현된 결함으로 재분류하지 않는다. 사용자의 성공 보고를 취소하지도 않는다. 다만 B-01/B-02 수정 이후에는 정상 provider 교환→linked account→세션→profile 동작이 유지됨을 같은 계정으로 확인해야 함 |

## D. 잘못된 backlog 확대를 피하기 위한 구분

- 기존 API URL, form transport, Play 내부 클래스, 설정 키 또는 스키마의 1:1 복제를 대체 조건으로 삼지 않았다. 위 항목은 보안, 파일 보존, 알림 선택, 검색 결과 등 사용자 관찰 결과다.
- Slack은 legacy Webhook 타입의 한 형태라는 원본 근거가 있으므로 별도의 새 Slack subsystem이 없다는 이유로 미구현 처리하지 않았다.
- Elasticsearch/OpenSearch, provider-specific 외부 logout, 임의의 추가 OAuth provider를 새 요구사항으로 만들지 않았다. 검색의 내부 FTS 사용 그 자체도 격차로 보지 않는다.
- `deferred-parity-closure-inventory.md:28,43-45`의 bounded closure는 현재 소스 확인을 대신하지 못한다. 반대로 과거 deferred 문구만으로 LDAP·mailbox·OAuth를 통째로 미구현이라 하지 않았다.
- 특히 `auth-deferred-oauth-ldap.md:12`의 “state가 있어 production 임의 인증이 막힌다”는 설명은 B-01 코드 경로와 양립하지 않는다. state 검증을 신원 검증으로 해석한 문서 결론을 그대로 인용하면 안 된다.

## 제한과 인수 기준

1. 이 문서는 지정 범위에 대한 우선순위 조사이며 전체 backend 함수와 모든 legacy 행동을 전수 대조했다는 선언이 아니다. 프로젝트/조직 ACL의 전체 조합, DB dialect별 SQL 결과, 모든 MIME/메일 정책과 모든 알림 event 종류를 실행하지 않았다.
2. tests/build/formatter/linter를 실행하지 않으라는 조사 지시를 지켰다. 따라서 소스 확정 결함의 공격 성공·성능 수치·실행 재현, 현재-only 수정의 이번 실행 green, 실서비스 연결 성공을 주장하지 않는다.
3. main/current 공통 판정은 관련 구현 파일 diff가 없거나 실제 `git show`를 읽어 동일한 경로임을 확인한 결과다. main에는 현재-only 수정이 없다는 점을 보존했다.
4. 기능 격차 종료에 새 대형 검증 체계는 필요 없다. 기존 route contract와 paired legacy 시나리오에 위 반례를 넣고, 네트워크 연동은 실제 사용할 환경에서 한 차례 end-to-end 증거를 붙이면 된다.
5. 최종 대체 승인에는 이 조사에서 확인한 공통 결함 해결, 선택한 baseline에 현재-only 수정 포함, 외부 연동 사용 범위에 맞는 실환경 증거가 필요하다. 과거 실패 로그 숫자나 fixture 성공 수를 현재 전체 완료 판정으로 옮기지 않는다.

## E. 브랜치 선택과 하위 호환 제외의 의미

2026-09-18 `git ls-remote origin refs/heads/main refs/heads/feature/pull-request`로 원격을 확인했다.

| 기준 | 커밋 | 관계 |
|---|---|---|
| local main / origin main | `7f03d4facbdf0b81a8306f284c41bd5c079062af` | 현재 브랜치의 조상 |
| current feature/pull-request | `c8b27212b` | main보다 5 commits 앞, main-only commits 0 |
| origin feature/pull-request | `c5505ee3562715542a5212546957629f985505ca` | 로컬 현재의 후속 수정 전체를 포함하지 않음 |

두 브랜치는 서로 다른 대안 구현이 아니다. 권장 기준은 현재 브랜치의 수정을 포함한 단일 candidate다. main을 그대로 채택하면 B절의 수정뿐 아니라 clean-checkout Docker packaging과 build-child 실패 전파 수정도 빠진다. 해당 main 결함과 수정 당시 증거는 `docs/provenance/release-gate-fixture.md:15-45`에 있다. 이번 분석에서 main을 다시 실행한 것은 아니다.

사용자의 **no backward compatibility required**는 구 Play form/PJAX, `/-_-api/v1`, JSON shape, 설정 alias, 내부 클래스/스키마의 영구 호환을 요구하지 않는 것으로 적용했다. React에서 같은 미리보기 기능이 된다면 옛 `/markdown/...` HTML 응답을 복제할 필요가 없다. 반면 인증 신뢰, 검색 결과, 알림 선택, 첨부파일, 저장소 이력과 기존 데이터 보존은 제품 기능이다. 하위 호환 제외로 이 기능을 버릴 수는 없다.

기존 설치를 이전한다면 단방향 변환과 검증으로 충분하다. 구 DB를 새 runtime이 영구 지원하거나 양방향 동기화할 필요는 없다. 이 분석은 기존 UX/deep-link에 관한 프로젝트 기준을 임의로 폐기하지 않는다.

## F. 프런트엔드와 최종 판정의 실제 남은 상태

### F-01. 확인된 UI gap

`SPEC.md:880`은 브랜치 날짜의 legacy 상대 시간/같은 해 `MM-dd` 및 전체 timestamp tooltip이 아직 gap임을 기록한다. `docs/agents/06-phase-plan.md:19`와 `.agent/astra-code-parity/live-smoke.json`이 관련 증거다. 최소 수정은 원본 committer timestamp를 API부터 보존하고 legacy `TemplateHelper.agoOrDateString`에 맞게 표시하는 것이다. 원본에 없는 보정 CSS는 필요 없다.

현재는 main 이후 코드 탐색의 비레거시 검색 패널/Tags 탭과 history branch selector trailing-slash 문제를 수정했다. 근거: `.agent/astra-code-parity/CodeBranchParity.json`, `CommitHistoryParity.json`, 현재 route 소스와 branch diff. 이는 모든 code/PR 상태의 parity 승인이 아니다.

### F-02. 저장된 실행 증거의 직접 재집계

| 증거 | 직접 확인한 결과 | 해석 |
|---|---|---|
| `.agent/differential/closure-full-final-current4/report.json` | 2026-09-09, 117 registered/attempted, step errors 0, 차이 84 = UNVERIFIED 17 + IMPLEMENTATION_DIFFERENCE 62 + LEGACY_BUG_NOT_REPRODUCED 5 | 오류 없이 실행됐지만 판정 미완료. 제품 결함 84개라는 뜻이 아님 |
| 같은 디렉터리 `behavior-coverage.json` + 현 inventory + `buildVerdict` | 313/315, B-0014/B-0015 미검증; failed/skipped required 0; behavior별 disposition 합계 31 | 행위 등록만으로 완료 처리하지 않는 현재 함수의 실제 결과 |
| `.agent/differential/astra-code-parity/report.json` | 2026-09-13, 6 scenarios, step errors 0, UNVERIFIED 5 + IMPLEMENTATION_DIFFERENCE 4 | R5, R6 두 건, R9, R15 미판정. 전체 sweep 결과를 대체하지 않음 |
| `.agent/pre-release-wtr-fast-final2.log:24652-24658` | 331 files, 1,395 passed, 0 failed | 해당 실행 범위의 성공 |
| `.agent/pre-release-wtr-final3.log:28715-28721` | 164 files, 692 passed, 0 failed | 별도 실행 범위의 성공. 앞선 실행과 단순 합산하지 않음 |

`scripts/differential/verdict.mjs:68-103`의 `buildVerdict`를 저장된 전체 sweep으로 실행했다. fast-lane을 미확인으로 두었을 때 false이며, **가정상 fast-lane=true로 바꾸어도** 미판정 17건과 미검증 2개 때문에 `ok=false`다. 이는 새 전체 검증 실행이 아니라 기존 자료 재평가다. 313/315는 inventory 기록의 검증률이지 제품 완성률 99.4%가 아니다.

B-0014/B-0015는 manager의 코드/리뷰 댓글 삭제와 삭제 후 상태·이동이다 (`docs/provenance/behavior-inventory.json`). 관련 삭제 구현은 존재한다. 기존 시나리오에서 올바른 actor/resource의 실제 삭제와 후속 navigation을 확인하고 coverage에 연결해야지, ID만 추가하거나 기능 부재로 단정하면 안 된다.

전체 sweep의 미판정 화면은 이슈 상세, 프로젝트 go, PR 생성/수정, commit history/detail, 코드 브라우저, 브랜치, 프로젝트 목록, site 사용자/프로젝트/이슈 목록, 사용자 프로필이다. 최신 focused 결과에서 history/file 화면 일부가 implementation difference로 분류됐지만, 서로 다른 시점의 결과를 합쳐 현재 전체 미판정이 5개라고 말할 수 없다.

두 JSON report의 최상위 metadata에는 runId/time은 있지만 commit SHA가 없다. 따라서 디렉터리 이름의 `current`를 현 HEAD 증명으로 사용하지 않는다. 최종 후보 하나에 코드 SHA·fixture·환경·각 gate 결과를 묶어야 한다. 새 검증 프레임워크가 아니라 기존 report/실행 기록에 귀속 근거를 남기면 된다.

### F-03. 가장 짧은 UI 종료 경로

1. 양 서버의 repository refs/commit graph/timestamp/PR state, actor, locale, viewport를 맞춘다.
2. 남은 화면만 desktop/mobile에서 visible role/copy/order/geometry와 mutation 전후 상태로 비교한다.
3. Select2/jQuery 전용 노드 차이는 기능 누락과 분리한다. 정상 버튼/행/문구 누락은 fingerprint 예외로 숨기지 않는다.
4. focused 증거가 모이면 같은 candidate에서 기존 전체 gate를 한 번 수행한다.

과거 `docs/reports/chatgpt-current-candidate-2026-09-09.md`의 “47 failures / 87 violations”를 현재 잔여 목록으로 쓰지 않는다. 62개의 implementation difference 역시 사유가 확인된 내부 차이와 사용자 관찰 차이를 구분해야 하며 숫자만으로 면제하지 않는다.

## G. 이전·VCS·운영 위험

### G-01 / P1 — 이전 실패가 성공 반환으로 끝나는 경로 (양 브랜치 공통)

- `crates/yona-migrate/src/main.rs:464-469`: attachment uploader 오류와 thread panic을 출력만 한다.
- 같은 파일 `1078-1105`: 저장소 이전을 요청한 흐름에서도 필요한 자격증명/source 위치가 없으면 `Ok(())`로 skip할 수 있다.
- 같은 파일 `1334-1348`: `svnrdump load` 실패 시 dump와 수동 복구 안내를 남기고 `Ok(())`를 반환한다.
- main의 같은 경로를 `git show`로 확인했다. current의 해당 파일 변경은 `--with-repos=false` 해석과 그 테스트 추가다.

수동 SVN 복구 자체는 허용 가능한 운영 방식이다. **복구하지 않은 상태를 완료로 취급하는 것**이 문제다. 최소 조치는 요청된 첨부/저장소 이전 실패를 실패 종료로 전파하고, 수동 복구 뒤 기존 preflight와 bytes/refs 확인을 통과해야 완료로 기록하는 것이다. 새 migration orchestration framework는 필요 없다.

인수 조건: 첨부 업로드 실패, 인증 누락, SVN load 실패를 주입하면 성공으로 종료하지 않으며, 재시도/수동 복구 후 대상의 첨부 bytes와 저장소 이력이 원본과 같아야 한다.

### G-02 — 프로젝트 단위 export를 완전 백업으로 사용하면 안 됨

`crates/server/src/routes/exports.rs:202-348,513-653`의 프로젝트 NDJSON은 issue/post/member/label/milestone 중심이며 `next_pull_request()`는 `Ok(None)`이다. main과 current 모두 동일한 제한을 가진다. 이를 **PR/review까지 무손실인 프로젝트 이전**이라고 사용할 수 없다.

이는 사이트 전체 DB adoption도 PR을 잃는다는 증거가 아니다. 교체에 사용할 경로는 우선 기존 전체 DB + 저장소 + uploads 이전/복구로 좁히는 편이 최소 작업이다. 프로젝트 단위 완전 이전이 실제 요구되는 경우에만 PR/review/event/comment/attachment 관계까지 확장한다. 다만 불완전 export를 완전 백업이라고 표시해서는 안 된다.

기준은 `yona-original/docs/yona-backup-restore.md`의 DB와 YONA_DATA 동시 보존이다. 구 dump/schema runtime 호환보다 **최종 데이터·권한·이력 보존**이 중요하다.

### G-03 — VCS 미구현이 아니라 배포 단위 증거 확인이 필요

Git Smart HTTP, push 후 알림/PR 갱신, SVN DAV 구현은 존재한다 (`crates/server/src/smart_http.rs`, `svn_protocol.rs`). Docker는 git/subversion을 설치한다 (`Dockerfile`). SVN 계약 테스트에는 도구가 없을 때 fixture를 건너뛰는 경로가 있다 (`crates/server/tests/svn_protocol_contract.rs:32-55`). 따라서 테스트 프로세스의 성공만으로 SVN 실행 성공을 주장하면 안 된다.

최종 후보의 실제 배포물에서 Git clone/fetch/push와 권한 거부, SVN checkout/update/commit 및 필요한 lock 흐름을 실제 client로 확인한다. PR/review backend 자체가 없다고 다시 구현할 이유는 없다. 이미 있는 테스트·실행 증거 중 어느 것이 최종 배포물과 같은 의존성을 사용했는지 먼저 연결한다.

기존 adoption/preflight 및 clean-checkout image 성공 증거는 `docs/provenance/release-gate-fixture.md:15-117`, 현재 후보 보고서의 첨부 6,535건/아바타 15건 preflight 기록 등에 있다. 이는 유용한 과거 증거이지 이번 HEAD의 전체 복구 리허설을 대체하지 않는다.

## H. 실행 순서와 최종 완료 조건

| 순서 | 작업 | 완료를 관찰하는 방법 |
|---|---|---|
| 1 | 현재 수정들을 포함한 candidate 고정; B-01/B-02 OAuth 결함 제거 | 올바른 state + 위조 신원 거부; 정상 provider 교환 성공; 결정식 로컬 비밀번호 거부; 이미 만들어진 영향 계정 처리 |
| 2a | MIME 첨부/CID, 게시글 알림 선택, 검색 의미 복원 | 원본 RFC822 bytes/파일권한, 작성자/비작성자 알림 분기, 타입별 결과 ID·순서·count 비교 |
| 2b | 이전 실패 전파와 실제 사용할 단일 cutover 경로 검증 | DB/파일/저장소 부분 실패는 완료 아님; 복구된 데이터/권한/refs/digests 확인 |
| 2c | 알려진 날짜 gap과 미판정 UI/댓글 삭제 증거 종료 | 동일 fixture live pair, 사용자-visible 상태 비교, B-0014/B-0015 실제 행위 확인 |
| 3 | 배포 환경 통합 확인 | 실제 Git/SVN client, 사용될 SMTP/LDAP/OAuth/webhook/mailbox 환경, backup→restore→restart 확인 |
| 4 | 동일 candidate에서 기존 전체 gate 및 human acceptance | user-visible gap 0, 미판정 0, 필요한 행위 미검증 0; source/fixture/result 귀속 명확 |

2a/2b/2c는 파일 소유 범위를 나누어 병렬 수행할 수 있다. 각 변경 중에는 해당 회귀/paired 확인만 하고 전체 suite는 통합 뒤 수행한다.

현재 제품을 처음부터 재작성하거나 구 API 호환층을 확대할 이유는 없다. 필요한 것은 **공통 보안·기능 결함 수정, 현재-only 수정의 보존, 안전한 데이터 이전, 같은 후보에 귀속되는 인수 증거**다. 이 조사는 실행 가능한 고위험 누락을 찾은 것이며, 모든 legacy 기능을 전수 검증한 완료 선언이 아니다. `SPEC.md:1642-1652`에 따라 최종 승인 이후에만 새 canonical repository로 이전해 최초 release한다.
