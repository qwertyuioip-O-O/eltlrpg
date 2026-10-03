# 디시 공동 보스 레이드

지정한 PC 디시 게시글에서 플레이하는 Chrome 확장 프로그램입니다. 공동 보스는 한국 시간 자정에 교체되며, 캐릭터·장비·골드는 유지됩니다. 서버는 Vercel API, 저장소는 Neon Postgres입니다.

## 개발 및 설치

Node.js 22 이상에서 실행하세요.

```powershell
npm ci
npm run typecheck
npm test
npm run build
```

Chrome의 `chrome://extensions`에서 개발자 모드를 켜고 **압축해제된 확장 프로그램을 로드**로 이 프로젝트의 `dist/extension` 폴더를 선택하세요. 확장 아이콘을 누르면 설정이 열립니다. API 주소와 허용된 게시글 URL을 저장하고 요청된 API 연결 권한을 허용하세요. 해당 글을 새로고침하면 본문 아래에 전장이 나타납니다.

## Vercel 및 Neon 배포

1. 이 프로젝트를 본인 Git 저장소에 올린 뒤 Vercel 프로젝트로 가져옵니다. Framework Preset은 **Other**, Build Command는 `npm run build`, Output Directory는 `dist`로 지정합니다. `api/game.ts`는 Vercel Function으로 배포됩니다.
2. Vercel Marketplace에서 Neon Postgres를 연결합니다. 연결된 프로젝트에 `DATABASE_URL`이 있는지 확인하고, 없다면 Neon의 pooled connection URL을 해당 이름으로 등록합니다. 연결 문자열에는 `sslmode=require`를 유지하세요.
3. 환경변수 `ALLOWED_POSTS`에 실제 게시글 URL을 등록합니다. 처음에는 하나만 등록하세요. 예: `https://gall.dcinside.com/mgallery/board/view/?id=YOUR_GALLERY&no=123`. 등록되지 않은 게시글은 API가 거부합니다.
4. 같은 DB 연결 문자열을 로컬 환경변수로 설정하고 마이그레이션을 적용합니다. `.env.example`은 예시이며 자동으로 로드하지 않습니다.

```powershell
$env:DATABASE_URL = 'Neon에서 복사한 연결 문자열'
npm run migrate
Remove-Item Env:DATABASE_URL
```

5. 환경변수 설정 후 Vercel을 재배포합니다. 확장 설정에서 `https://프로젝트.vercel.app`과 게시글 URL을 입력합니다. 공유할 API에는 Vercel Deployment Protection 인증이 없어야 합니다.
6. `dist/extension`을 다른 참여자에게 전달하고 각자 같은 주소를 설정하도록 합니다. 첫 입장 때 닉네임을 입력합니다. Chrome 웹 스토어 등록은 포함하지 않습니다.

Vercel/Neon 계정 및 실제 게시글은 사용자가 준비해야 합니다. 현재 저장소에는 배포 계정이나 인증 정보가 포함되어 있지 않습니다. 서비스의 무료 구간과 사용량은 각 대시보드에서 확인하세요. Vercel Hobby는 개인 비상업적 용도입니다.

로컬 API 확인에는 `npx vercel dev`를 사용할 수 있습니다. 해당 터미널에도 `DATABASE_URL`, `ALLOWED_POSTS` 환경변수를 설정하고 확장 API 주소는 `http://localhost:3000`으로 지정합니다.

## 게임 규칙

- 행동력 최대 20, 5분마다 1 회복. 공격·연습마다 1 사용합니다. 클라이언트가 닫혀 있어도 서버 시간으로 회복합니다.
- 공격마다 경험치 12, 골드 10. 레벨은 `1 + floor(sqrt(경험치 / 100))`입니다.
- 공격력은 기본 15, 레벨당 +3, 장착 장비의 능력치와 강화당 +2를 합산합니다. 세 슬롯 모두 공격력 보너스를 제공합니다.
- 보스 체력 10,000, 날짜에 따라 세 종류가 순환합니다. 밸런스 값은 `src/shared.ts`에서 변경합니다.
- 유효 피해를 준 참가자는 보스 처치 또는 하루 종료 후 장비 한 개를 받습니다. 보스를 놓쳤어도 전날 보상을 나중에 수령할 수 있습니다. 처치 성공은 추가 골드 100을 줍니다.
- 드롭은 무기·갑옷·장신구 중 무작위이며 능력치는 6~12입니다. 강화 비용은 `(현재 강화 + 1) × 50G`, 최대 +20입니다. 강화는 확정 성공합니다.
- 처치 후 연습 전투는 경험치·골드만 제공합니다. 보스 기여도와 장비 드롭에는 영향을 주지 않습니다.
- 비동기 게임이므로 다른 참가자 캐릭터가 전장에 실시간으로 등장하지는 않습니다. 화면의 캐릭터 이동은 자신의 공격 결과를 표현합니다.

## API와 데이터

모든 요청은 `POST /api/game`, JSON 형식입니다. 공통 필드는 `action`, `post`이며 등록 외에는 `Authorization: Bearer TOKEN`이 필요합니다.

| action | 추가 입력 | 결과 |
| --- | --- | --- |
| register | nickname | 게스트 토큰 |
| state | 없음 | 공동 상태, 캐릭터, 장비, 보상, 상위 10명 |
| attack | requestId, day, mode: raid/practice | 확정 피해량과 상태 |
| claim | requestId, day | 하루 참여 보상과 상태 |
| equip / upgrade | requestId, itemId | 장비 반영 상태 |

변경 요청은 UUID 요청 ID를 사용합니다. 동일 요청 재전송은 저장한 응답을 반환하고, 다른 행동에 같은 ID를 사용하면 거부합니다. 상태 응답은 재전송 당시 최신 상태가 아니라 최초 처리 당시 스냅샷이므로 이후 조회로 갱신합니다. 연결 오류 후 다시 연결 버튼은 미확정 요청을 같은 ID로 재시도합니다.

서버는 게시글별 트랜잭션 잠금으로 마지막 공격, 자정 전환, 보상 지급을 직렬 처리합니다. 장비 소유권·골드·행동력·피해량은 서버가 검증합니다. 신규 보스 생성은 첫 요청 시 진행하고 전날 기록은 보존합니다. 자정 이후 도착한 전날 공격은 소비 없이 새 상태를 반환합니다.

인증 토큰은 서버에 SHA-256 해시로 저장합니다. API 접근은 확장 service worker가 담당하며 게임 코드는 로컬 패키지에 포함됩니다. 토큰은 브라우저 설치에 귀속됩니다. 재설치·서버 주소 변경 시 계정 복구나 이전은 지원하지 않습니다. 게스트 생성 제한이나 다중 설치 방지는 포함되지 않으므로 초기 공유 대상을 소규모로 유지하세요.

## 검증 범위

`npm test`는 임베디드 PostgreSQL(PGlite)에서 실제 마이그레이션과 서버 SQL을 검증하고, 설치된 Chrome에서 두 개의 독립 브라우저 컨텍스트로 UI를 검증합니다. Chrome이 없는 환경은 브라우저 테스트를 건너뜁니다. `CHROME_PATH`로 실행 파일 경로를 지정할 수 있습니다. UI 테스트는 합성 디시 DOM과 모의 API를 사용하며 원래 본문·댓글 유지, 두 화면 상태 반영, 장비 행동, 연결 실패와 같은 요청 재시도, 접힌 화면·숨긴 탭 조회 중단, 다른 글 미표시를 확인합니다. 캡처는 `dist/qa/raid.png`에 생성됩니다.

PGlite는 단일 연결이므로 테스트 어댑터가 트랜잭션을 순서대로 실행합니다. 실제 Neon 연결에서 PostgreSQL advisory lock의 동시 실행 검증 및 실제 확장 권한/service worker 테스트는 배포 후 필요합니다.

배포 후 서로 다른 Chrome 프로필로 같은 글에서 공격하고 체력·기여도가 일치하는지 확인하세요. 실제 일반·마이너·미니 글에서 본문 아래 삽입과 댓글 동작을 확인하고, 일시적 네트워크 차단 및 새로고침 후 기록 복구를 확인하세요. 삭제되거나 DOM 구조가 달라진 게시글에서 본문을 찾지 못하면 게임을 삽입하지 않습니다.

Vercel Function 로그는 서버 오류를 기록합니다. 운영 중 API 오류와 Vercel/Neon 사용량을 확인하세요. 롤백은 이전 Vercel 배포와 확장 빌드를 사용합니다. 최초 마이그레이션은 반복 실행 가능하며 기록을 삭제하지 않습니다.
