# Dialect Compatibility Matrix

이 문서는 legacy MariaDB final schema를 canonical SeaORM baseline으로 정규화할 때 허용한 dialect 차이를 기록한다.

## Rules

- 보존 대상: table name, column name, nullability, PK/FK, unique/index semantics
- 정규화 허용 대상: vendor-specific physical type, boolean/date/time 표현, default syntax 차이
- canonical app schema 제외: framework bookkeeping table `play_evolutions`

## Matrix

### Auto-increment primary keys

- legacy MariaDB 표현: `bigint PRIMARY KEY`, 일부 table에서 auto-increment semantics 사용
- canonical SeaORM 표현: generated entity primary key + dialect-specific auto increment backend
- pg/mysql/sqlite 생성 결과: Postgres `bigserial`, MySQL `bigint auto_increment`, SQLite `integer primary key autoincrement`
- 허용 근거: identity syntax는 dialect physical representation 차이이며 logical PK/autoincrement 의미는 동일하다

### Boolean flags

- legacy MariaDB 표현: `boolean` 또는 tiny-int 계열 flag
- canonical SeaORM 표현: Rust side에서는 bool 또는 optional integer flag를 유지하고 migration SQL은 dialect native boolean 표현을 사용
- pg/mysql/sqlite 생성 결과: Postgres `boolean`, MySQL `boolean/tinyint(1)`, SQLite `integer`
- 허용 근거: legacy semantics는 truthy flag이며 dialect storage class 차이는 parity concern이 아니다

### Date and time columns

- legacy MariaDB 표현: `datetime`
- canonical SeaORM 표현: generated entity의 `DateTime` / nullable timestamp field 유지
- pg/mysql/sqlite 생성 결과: Postgres `timestamp`, MySQL `datetime`, SQLite `integer`
- 허용 근거: baseline은 logical timestamp presence를 보존하고 physical storage/encoding은 backend-specific normalization으로 허용한다

### Large text payloads

- legacy MariaDB 표현: `longtext`
- canonical SeaORM 표현: entity layer에서는 string/text column으로 유지
- pg/mysql/sqlite 생성 결과: Postgres `text`, MySQL `longtext`, SQLite `text`
- 허용 근거: issue/comment/posting payload의 semantic contract는 unbounded text이며 backend type name 차이는 허용 가능한 정규화다
