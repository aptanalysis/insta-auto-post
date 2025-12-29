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

def upload_to_instagram(access_token, account_id, image_url, caption):
    # 1️⃣ 컨테이너 생성
    create_url = f"https://graph.facebook.com/v24.0/{account_id}/media"

    payload = {
        "image_url": image_url,
        "caption": caption,
        "access_token": access_token
    }

    r = requests.post(create_url, data=payload)
    print("CREATE STATUS:", r.status_code)
    print("CREATE RESPONSE:", r.text)
    r.raise_for_status()

    creation_id = r.json().get("id")
    if not creation_id:
        raise RuntimeError("컨테이너 ID 생성 실패")

    # 2️⃣ 게시
    publish_url = f"https://graph.facebook.com/v24.0/{account_id}/media_publish"

    r2 = requests.post(
        publish_url,
        data={
            "creation_id": creation_id,
            "access_token": access_token
        }
    )

    print("PUBLISH STATUS:", r2.status_code)
    print("PUBLISH RESPONSE:", r2.text)
    r2.raise_for_status()

    return r2.json()

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

    upload_to_instagram(
        access_token=ACCESS_TOKEN,
        account_id=IG_USER_ID,
        image_url=post["media"]["image_url"],
        caption=full_caption
    )

    status["posted"] = True
    status["posted_at"] = now.isoformat()
    updated = True


# ===============================
# JSON 저장
# ===============================
if updated:
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
