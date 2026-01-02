import os
import json
import requests
import time
from datetime import datetime
from zoneinfo import ZoneInfo
from requests.exceptions import HTTPError, Timeout # Timeout 대신 Timeout을 임포트
# 기존 코드에서 Timeout를 사용하던 모든 부분을 Timeout으로 변경해야 합니다.

# ===============================
# 기본 설정
# ===============================
ACCESS_TOKEN = os.environ["IG_ACCESS_TOKEN"]
IG_USER_ID = os.environ["IG_USER_ID"]

# 현재 API 버전 v24.0을 사용하므로 통일
GRAPH_URL = "https://graph.facebook.com/v24.0"
TZ = ZoneInfo("Asia/Seoul")
now = datetime.now(TZ)

JSON_PATH = "data/posts.json"

# ===============================
# JSON 로드
# ===============================
try:
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
except FileNotFoundError:
    print(f"ERROR: {JSON_PATH} 파일을 찾을 수 없습니다.")
    exit(1)

posts = data["posts"]

# ===============================
# Fail-Safe 로직 함수
# ===============================

def check_media_status(container_id, access_token, max_attempts=30, delay_seconds=10):
    """
    미디어 컨테이너의 상태가 'FINISHED'가 될 때까지 확인하고 대기합니다.
    (최대 30회 * 10초 = 5분 대기)
    """
    status_url = f"{GRAPH_URL}/{container_id}"
    params = {
        'fields': 'status_code,status',
        'access_token': access_token
    }
    
    print(f"  > [대기 시작] 컨테이너 ID: {container_id}")

    for attempt in range(1, max_attempts + 1):
        try:
            r = requests.get(status_url, params=params)
            r.raise_for_status()
            response_data = r.json()
            status_code = response_data.get('status_code')
            
            print(f"  > 시도 {attempt}/{max_attempts}: 현재 상태 = {status_code}")

            if status_code == 'FINISHED':
                print(f"  > 컨테이너 {container_id} 처리 완료 (FINISHED).")
                return True
            
            elif status_code == 'ERROR':
                error_message = response_data.get('status', '상세 메시지 없음')
                raise Exception(f"미디어 컨테이너 처리 중 서버 에러 발생: {error_message} (ID: {container_id})")

        except HTTPError as e:
            print(f"  > 상태 확인 중 HTTP 에러 발생: {e}")
            # API 요청 자체의 문제일 경우 잠시 기다린 후 다시 시도
        except Exception as e:
            raise e # 다른 예외는 상위로 전달

        time.sleep(delay_seconds)
        
    raise Timeout(f"미디어 컨테이너 {container_id}가 {max_attempts * delay_seconds}초 내에 처리되지 않았습니다.")


# ===============================
# Instagram 업로드 함수
# ===============================

def create_media_container(access_token, account_id, image_url, is_carousel_item=False):
    url = f"{GRAPH_URL}/{account_id}/media"

    payload = {
        "image_url": image_url,
        "access_token": access_token
    }

    if is_carousel_item:
        payload["is_carousel_item"] = True

    r = requests.post(url, data=payload)
    print("CREATE STATUS:", r.status_code)
    print("CREATE RESPONSE:", r.text)
    r.raise_for_status()

    return r.json()["id"]

def publish_carousel(access_token, account_id, media_ids, caption):
    # 1. 모든 개별 컨테이너가 준비될 때까지 대기 (1번 로직 적용)
    try:
        for media_id in media_ids:
            check_media_status(media_id, access_token)
    except (Timeout, Exception) as e:
        print(f"❌ [게시 실패] 미디어 처리 문제로 PUBLISH 중단: {e}")
        return False # 실패

    # 2. 카루셀 부모 컨테이너 생성
    url = f"{GRAPH_URL}/{account_id}/media"
    payload = {
        "media_type": "CAROUSEL",
        "children": ",".join(media_ids),
        "caption": caption,
        "access_token": access_token
    }

    r = requests.post(url, data=payload)
    r.raise_for_status()
    creation_id = r.json()["id"]
    print(f"CREATE CAROUSEL ID: {creation_id}")
    
    # 2-1. 부모 컨테이너도 READY 상태가 될 때까지 대기
    try:
        check_media_status(creation_id, access_token)
    except (Timeout, Exception) as e:
        print(f"❌ [게시 실패] 카루셀 컨테이너 처리 문제로 PUBLISH 중단: {e}")
        return False # 실패

    # 3. 최종 게시 (PUBLISH) (2번 로직 적용)
    publish_url = f"{GRAPH_URL}/{account_id}/media_publish"
    data = {"creation_id": creation_id, "access_token": access_token}
    
    try:
        r2 = requests.post(publish_url, data=data)

        if r2.status_code != 200:
            print(f"⚠️ [HTTP 상태 코드 {r2.status_code}] 응답 본문: {r2.text}")
            
        r2.raise_for_status() # 4xx, 5xx 에러 발생 시 여기서 예외 처리 시작
        
        print("✅ 최종 게시 성공!")
        return True

    except HTTPError as e:
        # 중복 에러 등을 여기서 잡고 프로그램 중단 방지
        print(f"\n❌ [게시 실패] HTTP 에러 발생: {e}")
        try:
            print("  > API 상세 에러:", r2.json())
        except Exception:
            pass
        
        print("==> 프로그램 중단 없이 스크립트를 안전하게 종료합니다.")
        return False # 실패하더라도 프로그램은 계속 진행


# ===============================
# 게시 처리
# ===============================
updated = False
success_count = 0

for post in posts:
    publish_dt = datetime.fromisoformat(
        f"{post['publish']['date']} {post['publish'].get('time', '00:00')}"
    ).replace(tzinfo=TZ)

    status = post.setdefault(
        "status",
        {"posted": False, "posted_at": None}
    )

    # 1️⃣ 오늘 날짜가 아니면 패스
    if publish_dt.date() != now.date():
        continue

    # 2️⃣ 이미 게시했으면 패스
    if status["posted"]:
        continue

    print("-" * 30)
    print(f"📸 업로드 실행: {post['apt']['name']}")

    caption = post["content"]["caption"]
    hashtags = " ".join(f"#{h}" for h in post["content"]["hashtags"])
    full_caption = f"{caption}\n\n{hashtags}"

    media = post["media"]
    images = media.get("images")
    
    if not images:
        print(f"❌ {post['apt']['name']}: media.images 가 없습니다. 스킵합니다.")
        continue
    
    is_success = False

    # 📸 캐러셀
    if len(images) > 1:
        media_ids = []
        try:
            for img_url in images:
                media_id = create_media_container(
                    ACCESS_TOKEN,
                    IG_USER_ID,
                    img_url,
                    is_carousel_item=True
                )
                media_ids.append(media_id)
            
            is_success = publish_carousel(
                ACCESS_TOKEN,
                IG_USER_ID,
                media_ids,
                full_caption
            )
        except HTTPError as e:
            print(f"❌ [캐러셀 생성 실패] HTTP 에러 발생: {e}")
            is_success = False # 캐러셀 생성 중 실패하면 게시하지 못함
        
    # 📸 단일 이미지
    else:
        try:
            # 1. 미디어 컨테이너 생성
            media_id = create_media_container(
                ACCESS_TOKEN,
                IG_USER_ID,
                images[0]
            )
            
            # 2. 미디어 상태 확인 및 대기 (1번 로직 적용)
            check_media_status(media_id, ACCESS_TOKEN)
            
            # 3. 최종 게시 (2번 로직 적용)
            publish_url = f"{GRAPH_URL}/{IG_USER_ID}/media_publish"
            data = {"creation_id": media_id, "access_token": ACCESS_TOKEN}
            
            r2 = requests.post(publish_url, data=data)
            
            if r2.status_code != 200:
                print(f"⚠️ [HTTP 상태 코드 {r2.status_code}] 응답 본문: {r2.text}")
                
            r2.raise_for_status()
            
            print("✅ 단일 이미지 최종 게시 성공!")
            is_success = True
            
        except (HTTPError, Timeout, Exception) as e:
            print(f"\n❌ [단일 이미지 게시 실패] 에러 발생: {e}")
            try:
                if 'r2' in locals() and r2.status_code != 200:
                    print("  > API 상세 에러:", r2.text)
            except NameError:
                 pass
            is_success = False
            print("==> 프로그램 중단 없이 스크립트를 안전하게 종료합니다.")

    # 게시 성공 시 JSON 업데이트
    if is_success:
        status["posted"] = True
        status["posted_at"] = now.isoformat()
        updated = True
        success_count += 1

print("=" * 30)
print(f"✅ 총 {success_count}건의 게시물 처리 완료 (업로드 성공 또는 에러 회피).")
print("=" * 30)

# ===============================
# JSON 저장
# ===============================
if updated:
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"JSON 파일 ({JSON_PATH})이 업데이트되었습니다.")
else:
    print("JSON 파일에 업데이트된 내용이 없습니다.")