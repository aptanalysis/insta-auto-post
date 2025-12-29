import os
import json
import requests
from datetime import datetime
from zoneinfo import ZoneInfo

# ===============================
# 기본 설정
# ===============================
ACCESS_TOKEN = os.environ["IG_ACCESS_TOKEN"]
IG_USER_ID = os.environ["IG_USER_ID"]

GRAPH_URL = "https://graph.facebook.com/v19.0"
TZ = ZoneInfo("Asia/Seoul")
now = datetime.now(TZ)

JSON_PATH = "data/posts.json"

# ===============================
# JSON 로드
# ===============================
with open(JSON_PATH, encoding="utf-8") as f:
    data = json.load(f)

posts = data["posts"]

# ===============================
# Instagram 업로드 함수
# ===============================
API_VERSION = "v24.0"


def create_media_container(access_token, account_id, image_url, is_carousel_item=False):
    url = f"https://graph.facebook.com/v24.0/{account_id}/media"

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
    url = f"https://graph.facebook.com/v24.0/{account_id}/media"

    payload = {
        "media_type": "CAROUSEL",
        "children": ",".join(media_ids),
        "caption": caption,
        "access_token": access_token
    }

    r = requests.post(url, data=payload)
    r.raise_for_status()
    creation_id = r.json()["id"]

    publish_url = f"https://graph.facebook.com/v24.0/{account_id}/media_publish"
    r2 = requests.post(
        publish_url,
        data={"creation_id": creation_id, "access_token": access_token}
    )
    r2.raise_for_status()
# ===============================
# 게시 처리
# ===============================
updated = False

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

    print(f"📸 업로드 실행: {post['apt']['name']}")

    caption = post["content"]["caption"]
    hashtags = " ".join(f"#{h}" for h in post["content"]["hashtags"])
    full_caption = f"{caption}\n\n{hashtags}"

    media = post["media"]

    # 이미지 배열로 통일
    images = media.get("images")
    
    if not images:
        raise ValueError("media.images 가 없습니다")
    
    # 📸 캐러셀
    if len(images) > 1:
        media_ids = []
        for img_url in images:
            media_id = create_media_container(
                ACCESS_TOKEN,
                IG_USER_ID,
                img_url,
                is_carousel_item=True
            )
            media_ids.append(media_id)
    
        publish_carousel(
            ACCESS_TOKEN,
            IG_USER_ID,
            media_ids,
            full_caption
        )
    
        status["posted"] = True
        status["posted_at"] = now.isoformat()
        updated = True
    
    # 📸 단일 이미지
    else:
        media_id = create_media_container(
            ACCESS_TOKEN,
            IG_USER_ID,
            images[0]
        )
    
        publish_url = f"https://graph.facebook.com/v24.0/{IG_USER_ID}/media_publish"
        requests.post(
            publish_url,
            data={"creation_id": media_id, "access_token": ACCESS_TOKEN}
        ).raise_for_status()
    
        status["posted"] = True
        status["posted_at"] = now.isoformat()
        updated = True


# ===============================
# JSON 저장
# ===============================
if updated:
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
