# 🍼 육아템 최저가 알리미

관심 있는 육아용품을 **카테고리에서 골라 즐겨찾기(추적)** 해두면, 여러 쇼핑몰 가격을 주기적으로 확인하고
**평소보다 싸지면 휴대폰/PC로 웹 푸시 알림**과 구매 링크를 보내주는 웹앱(PWA)입니다.

- **가격 출처**: [네이버 쇼핑 검색 API](https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md) (공식, 무료, 하루 25,000회)
  - 네이버 가격비교 상품은 쿠팡·11번가·G마켓·SSG·롯데ON 등 여러 쇼핑몰 중 최저가를 한 번에 알려줍니다.
  - 같은 상품명·용량(단계/매수/팩수 등 숫자가 모두 같은 것)을 파는 개별 쇼핑몰도 함께 비교합니다.
- **알림**: 웹 푸시 (Android Chrome, PC 브라우저, iPhone은 *홈 화면에 추가* 후 iOS 16.4+)
- **화면**: 카테고리 12개(기저귀·분유·물티슈·수유용품·이유식·유모차·카시트·아기띠·목욕위생·장난감·침구가구·의류), 검색, 관심상품, 상품 상세(가격 추이 그래프·쇼핑몰별 가격), 알림 내역, 설정

## 알림은 언제 오나요?

| 조건 | 설명 |
|---|---|
| 평소가 대비 할인 | **평소 가격 = 최근 30일 가격 기록의 중앙값.** 현재 최저가가 평소가보다 *N%* 이상 싸면 알림 (기본 5%, `DEFAULT_DROP_PCT`, 상품별 변경 가능) |
| 목표가 도달 | 상품별로 목표가를 정하면 그 가격 이하일 때 알림 |
| 역대 최저가 | 위 조건을 만족하면서 추적 이후 최저가면 알림에 함께 표시 |

같은 할인으로 알림이 반복되지 않도록, 한 번 알린 뒤에는 **가격이 더 내려갈 때만** 다시 알리고,
가격이 평소 수준으로 돌아오면 초기화되어 다음 할인 때 다시 알립니다.
기록이 3개 미만인 초기에는 등록 당시 가격을 평소가로 씁니다.

## 빠른 시작 (로컬)

```bash
cd baby-price-tracker
npm install
cp .env.example .env
npm run dev          # http://localhost:3000
```

API 키 없이도 **MOCK(가짜 데이터) 모드**로 모든 화면과 알림 흐름을 체험할 수 있어요.

### 1) 네이버 API 키 발급
1. https://developers.naver.com/apps 에서 **애플리케이션 등록**
2. 사용 API: **검색** 선택, 환경: WEB 설정에 사이트 주소(로컬은 `http://localhost:3000`) 입력
3. 발급된 Client ID/Secret을 `.env`의 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`에 입력

### 2) 웹 푸시 설정
```bash
npm run vapid
```
출력된 Public Key / Private Key를 `.env`의 `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`에 넣고,
`VAPID_SUBJECT`에 본인 이메일(`mailto:...`)을 넣습니다. 앱의 **설정 → 🔔 알림 켜기**를 누르면 그 기기가 등록돼요.
(한 번 정한 VAPID 키를 바꾸면 기존 기기 등록이 무효가 되니 바꾸지 마세요.)

### 3) 주기적 가격 체크
가격 체크는 `GET /api/cron/check` (헤더 `Authorization: Bearer <CRON_SECRET>`)를 호출하면 실행됩니다.
`.env`에 `CRON_SECRET`을 긴 랜덤 문자열로 정하고, 아래 중 하나로 3시간마다 호출하세요.

- **GitHub Actions (이 저장소에 포함)**: `.github/workflows/baby-price-check.yml`.
  저장소 Settings → Secrets에 `BABY_PRICE_APP_URL`(배포 주소), `BABY_PRICE_CRON_SECRET`을 추가하면 동작합니다.
- **자체 서버 crontab**: `0 */3 * * * cd /path/baby-price-tracker && npm run check`
- 앱 화면의 **🔄 전체 지금 체크** / 상품별 **지금 체크** 버튼으로 수동 실행도 가능해요.

## 배포

웹 푸시는 **HTTPS**에서만 동작하므로 인터넷에 배포해야 휴대폰에서 알림을 받을 수 있어요.

**Vercel (추천, 무료)**
1. DB: 서버리스에서는 파일 DB가 유지되지 않으므로 [Turso](https://turso.tech)(무료 SQLite 호스팅)에서 DB를 만들고
   `DATABASE_URL=libsql://...`, `DATABASE_AUTH_TOKEN=...` 설정
2. Vercel에서 이 저장소를 Import → **Root Directory를 `baby-price-tracker`** 로 지정
3. 환경 변수(`.env.example`의 항목들) 입력 후 배포
4. 위 GitHub Actions secrets에 배포 주소 등록

**자체 서버/NAS**: `npm run build && npm start` (기본 `file:./data/app.db` SQLite 사용) + HTTPS 리버스 프록시 + crontab.

**혼자/가족만 쓰기**: `APP_PASSWORD`를 설정하면 접속 시 비밀번호를 묻습니다(아이디는 아무거나).
즐겨찾기는 앱 전체에서 공유되고, 알림 켠 모든 기기로 알림이 갑니다.

## 구조

```
src/
  lib/naver.ts      네이버 쇼핑 API 호출, 동일상품 판별, MOCK 데이터
  lib/pricing.ts    평소가(중앙값) 계산 & 알림 판단 (순수 함수, 테스트 있음)
  lib/tracker.ts    상품 추가, 가격 체크 → 기록 저장 → 알림 발송
  lib/push.ts       웹 푸시 발송 (만료된 기기 자동 정리)
  lib/db.ts         libSQL(SQLite/Turso) 스키마
  app/              화면 & API 라우트
public/sw.js        서비스 워커 (푸시 수신, 클릭 시 구매 링크 열기)
scripts/check-prices.ts   CLI 가격 체크 (npm run check)
```

```bash
npm test          # 가격/알림 로직, 상품 매칭 테스트
npm run typecheck
```

## 한계 & 다음 단계 아이디어
- 쿠팡 로켓배송 등 네이버 쇼핑에 노출되지 않는 가격은 잡히지 않습니다 (직접 스크래핑은 약관·차단 문제로 제외).
- 쿠폰/카드 할인/배송비는 반영되지 않은 표시가 기준입니다.
- 아이디어: 사용자 계정 분리, 텔레그램/이메일 알림 추가, 상품 묶음(같은 상품 여러 용량) 단가 비교(1매당 가격).
