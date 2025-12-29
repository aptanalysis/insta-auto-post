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
def upload_to_instagram(image_url, caption):
    r = requests.post(
        f"{GRAPH_URL}/{IG_USER_ID}/media",
        data={
            "image_url": image_url,
            "caption": caption,
            "access_token": ACCESS_TOKEN
        },
        timeout=10
    )
    r.raise_for_status()
    creation_id = r.json()["id"]

    r = requests.post(
        f"{GRAPH_URL}/{IG_USER_ID}/media_publish",
        data={
            "creation_id": creation_id,
            "access_token": ACCESS_TOKEN
        },
        timeout=10
    )
    r.raise_for_status()

# ===============================
# 게시 처리
# ===============================
updated = False

for post in posts:
    publish_dt = datetime.fromisoformat(
        f"{post['publish']['date']} {post['publish']['time']}"
    ).replace(tzinfo=TZ)

    status = post.setdefault(
        "status",
        {"posted": False, "posted_at": None}
    )

    if status["posted"]:
        continue

    if publish_dt <= now:
        apt_name = post["apt"]["name"]
        print(f"📸 업로드 실행: {apt_name}")

        caption = post["content"]["caption"]
        hashtags = " ".join(f"#{h}" for h in post["content"]["hashtags"])
        full_caption = f"{caption}\n\n{hashtags}"

        upload_to_instagram(
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
