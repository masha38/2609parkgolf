# 위해 파크골프 랜딩페이지 운영 안내

## 바로 확인하기

`index.html`을 열면 페이지를 확인할 수 있습니다. 실제 배포 시에는 정적 호스팅 또는 여행사 웹서버에 폴더 전체를 업로드하세요.

## 운영 전에 입력할 정보

`config.js`에서 아래 두 값을 입력해야 합니다.

- `kakaoUrl`: 카카오톡 채널 상담 URL
- `formEndpoint`: Apps Script 웹 앱 배포 후 받은 `/exec` 주소

`formEndpoint`에는 다음 JSON 값이 전송됩니다.

- `tour`: `cruise`, `air`, `compare`
- `name`
- `phone`
- `privacy`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- `page_url`, `referrer`, `user_agent`

## 구글시트 상담 접수 연결

1. `구글시트_상담신청_컬럼샘플.xlsx`를 구글 드라이브에 업로드하고 구글시트 형식으로 저장합니다.
2. 구글시트의 `확장 프로그램 > Apps Script`에서 `apps-script/Code.gs`를 붙여넣습니다.
3. `setupProject` 함수를 한 번 실행해 시트와 권한을 설정합니다.
4. 웹 앱으로 배포할 때 실행 사용자는 `나`, 액세스 사용자는 `모든 사용자`로 설정합니다.
5. 발급된 `/exec` URL을 `config.js`의 `formEndpoint`에 입력합니다.
6. 테스트 신청 후 `상담신청` 탭에 새 행이 저장되는지 확인합니다.

요청 필드, 시트 컬럼, 검증 규칙과 운영 방법은 `APPS_SCRIPT_연동_명세서.md`에 정리되어 있습니다.

## 반드시 확정할 항목

- 사업자등록번호, 관광사업등록번호, 영업보증보험 정보
- 개인정보처리방침과 국외여행약관
- 상품별 취소·환불 규정
- 각 파크골프장 이용료와 장비 대여·운송 조건
- 호텔 및 객실 확정 정보
- 크루즈 부두세와 싱글룸 적용 기준
- 항공 일정표 이미지의 출발일 표기

## 항공 일정표 이미지 확인

현재 제공된 항공 일정표 이미지에는 `9월 1일`로 표시되어 있으나 페이지와 신청 폼은 기존 확정 내용인 `9월 14일`을 기준으로 구성되어 있습니다. 광고 집행 전 날짜가 수정된 최종 이미지를 교체해야 합니다.

## 광고 측정

페이지는 다음 이벤트를 `dataLayer`에 전달할 준비가 되어 있습니다.

- `cta_click`
- `tour_select`
- `lead_submit`
- `lead_submit_error`

Google Tag Manager를 연결하면 광고 채널별 전환 측정에 사용할 수 있습니다.
