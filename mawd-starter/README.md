# MAWD Start-up Challenge 준비 키트

## 1. 파트너사 API 요약

| 파트너 | 할 수 있는 것 | 인증 | 주의할 점 | 공식 문서 |
|---|---|---|---|---|
| **채널톡** | 상담 메시지 조회/전송, 고객 정보, **웹훅**(새 문의 오면 내 서버로 알림) | 헤더 `x-access-key` + `x-access-secret` (Bearer 아님) | Open API는 **유료 플랜** 필요. 2026-07에 신버전 전환됨, 최신 엔드포인트 확인 | api-doc.channel.io / developers.channel.io |
| **스티비** | 주소록 구독자 추가·수정·삭제, **자동 이메일 API**(이벤트 → 메일 발송), 웹훅 6종 | API 키 (워크스페이스 설정 → API 키) | **스탠다드 플랜 이상** 필요 | developers.stibee.com / help.stibee.com/api-webhook |
| **Vapi** | AI 음성 에이전트 생성, **인바운드/아웃바운드 전화**, 대화 중 내 서버 함수 호출(tools), 통화 종료 리포트 | `Authorization: Bearer <키>` | 전화 걸려면 Vapi 전화번호 필요, 번호는 E.164(+8210...). 웹 통화(브라우저)는 번호 없이 가능 | docs.vapi.ai |
| **Liner** | 웹/학술 **검색 API**(JSON), Search Agent·Quick Answer·**Deep Research** API(출처 포함 답변), MCP 서버 | 헤더 `x-api-key` | 유료 크레딧(웹검색 1,000회당 $1~2). `include_knowledge:false`면 저렴 | liner.com/developers/docs |
| **Render** | 웹서비스/정적 사이트/DB 배포, GitHub 푸시 시 자동 배포 | GitHub 연동 | 무료 플랜은 15분 미사용 시 슬립(첫 요청 느림), 디스크 휘발 | render.com/docs |
| **Alt** | 확인 못 함 | - | 어떤 회사/API인지 공개 정보로 특정 불가 → **현장에서 확인** | - |

> 채널톡·스티비 API가 유료 플랜이 필요하므로 **파트너사가 해커톤용 크레딧/플랜을 주는지** 오프닝 때 꼭 확인하세요.

## 2. 조합 아이디어 (과제 공개 후 골라 쓰기)

### A. 1인 쇼핑몰 AI CS 직원 — 채널톡 + Liner + 스티비
- 채널톡 웹훅으로 새 문의 수신 → LLM이 분류(배송/환불/상품문의) → FAQ·정책 기반 답변 자동 전송
- 모르는 질문은 Liner로 검색해 근거 붙인 초안을 사장에게만 보여줌
- 문의 고객을 스티비 주소록에 태깅 → 재구매 쿠폰 자동 메일
- **피칭 포인트:** "CS 응답시간 N분 → 즉시, 사장 하루 2시간 절약"

### B. 전화 받는 AI 예약 비서 — Vapi + 채널톡 + 스티비
- 미용실·공방·과외 등 1인 사업자의 전화를 Vapi 에이전트가 받아 예약/문의 처리
- 통화 종료 리포트 → 요약을 사장 채널톡으로 전송, 고객에겐 스티비로 예약 확인 메일
- **데모가 강력함:** 심사위원 앞에서 실제로 전화 걸기

### C. 자동 운영 뉴스레터 미디어 — Liner + 스티비 + Render
- 매일 정해진 주제를 Liner Deep Research로 조사 → LLM이 뉴스레터 작성 → 스티비 자동 발송
- 랜딩 페이지(이 스타터)로 구독자 모집 → **해커톤 중 실제 구독자 수 = 시장 반응 지표**
- **가장 만들기 쉽고**, 유저 모으기 쉬워서 시장 반응 점수 노리기 좋음

추천: 개발자가 적거나 시간 부족하면 **C**, 임팩트 노리면 **B**, 기업 과제가 CS/B2B 쪽이면 **A**.

## 3. 계정·API 키 체크리스트 (출발 전에!)

- [ ] **GitHub** 계정 (Render 배포에 필요)
- [ ] **Render**: render.com 에서 GitHub로 가입
- [ ] **채널톡**: 채널 생성 → 설정 > 보안 및 개발 > API 에서 Access Key/Secret 발급 (유료 플랜 여부 확인)
- [ ] **스티비**: 가입 → 주소록 1개 생성(주소록 ID 메모) → 워크스페이스 설정 > API 키
- [ ] **Vapi**: dashboard.vapi.ai 가입 → API Keys → 어시스턴트 1개 만들어 웹에서 테스트 통화
- [ ] **Liner**: platform.liner.com 에서 API 키 발급, 크레딧 확인
- [ ] LLM 키 (OpenAI/Anthropic 등) — 현장 AI 크레딧 지원 여부 확인
- [ ] 받은 키는 `.env.example`을 `.env`로 복사해 채우기 (**깃에 올리지 말 것**)

## 4. Render 배포 테스트 (10분)

로컬에 Node/Git이 없어도 됩니다. Render가 서버에서 빌드해요.

1. GitHub에서 새 저장소 만들기 (예: `mawd-starter`, Private 가능)
2. **Add file → Upload files** 로 이 폴더 안의 파일 전부 드래그 (`.env`는 제외)
3. Render 대시보드 → **New → Blueprint** → 저장소 선택 → `render.yaml` 자동 인식 → Apply
4. 환경변수 입력 화면에서 받은 키 입력 (없는 건 비워둬도 서버는 뜸)
5. 배포 끝나면 `https://<앱이름>.onrender.com/health` 접속 → `{"ok":true, "keys":{...}}` 보이면 성공
6. `https://<앱이름>.onrender.com/` 에 대기 신청 랜딩 페이지가 뜸

## 5. 스타터 엔드포인트

| 경로 | 기능 |
|---|---|
| `GET /` | 대기 신청 랜딩 페이지 (`public/index.html` 문구만 바꾸면 됨) |
| `GET /health` | 서버 상태 + 어떤 키가 설정됐는지 |
| `POST /api/waitlist` | `{email, name}` → 스티비 주소록 (키 없으면 임시 파일) |
| `POST /api/research` | `{query}` → Liner 웹 검색 |
| `POST /api/channel/send` | `{userChatId, text}` → 채널톡 메시지 |
| `POST /api/vapi/call` | `{number}` → Vapi 아웃바운드 전화 |
| `POST /webhooks/channel` | 채널톡 웹훅 수신 (여기에 AI 로직 추가) |
| `POST /webhooks/vapi` | Vapi server URL (통화 리포트 수신) |

⚠️ 스티비·채널톡 엔드포인트 경로와 필드는 공개 자료 기준으로 작성했어요. 키를 받으면 공식 문서와 한 번 대조하세요.
