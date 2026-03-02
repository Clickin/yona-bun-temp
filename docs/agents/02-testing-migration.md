# 02) 테스트 주도 마이그레이션 아키텍처

## 원칙

- TDD(Red-Green) 우선: 테스트 명세를 먼저 작성하고 구현한다.

## 테스트 전략

1. **단위/통합 테스트 (Vitest)**
   - Play Controller 테스트 -> Hono API 통합 테스트
   - Ebean Model 테스트 -> Drizzle Schema / Core Domain 테스트
   - Service 테스트 -> Usecase 단위 테스트
2. **E2E 테스트 (Playwright)**
   - 주요 유저 플로우를 브라우저 관점에서 검증한다.
