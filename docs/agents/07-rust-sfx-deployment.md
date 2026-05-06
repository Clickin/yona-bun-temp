# 07) Rust SFX 배포 가이드

## 목표

- `repo root` workspace를 single-binary/SFX와 Docker/Kubernetes 양쪽에 맞게 유지한다.
- frontend build output과 backend runtime을 하나의 Rust 배포 단위로 묶을 수 있게 한다.
- user-uploaded asset과 embedded/static asset을 명확히 분리한다.

## SFX 원칙

- OS별 Rust binary를 별도 빌드한다.
- frontend 정적 자산은 canonical runtime이 읽을 수 있는 방식으로 포함한다.
- user-uploaded asset과 DB 파일은 실행 파일 내부에 넣지 않는다.
- runtime base path는 first-class 요구사항으로 유지한다.

## 운영 규칙

- session/auth bootstrap, asset delivery, HTTP/REST 진입점은 동일한 runtime 기준을 공유해야 한다.
- 환경별 secret과 credential은 실행 파일이 아니라 외부 주입으로 관리한다.
- single-binary 배포와 container 배포가 동일한 contract를 제공해야 한다.
