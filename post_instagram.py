import os
import json
import requests
from datetime import date, datetime

ACCESS_TOKEN = os.environ["IG_ACCESS_TOKEN"]
IG_USER_ID = os.environ["IG_USER_ID"]

GRAPH_URL = "https://graph.facebook.com/v19.0"
today = date.today().isoformat()

# JSON 로드
with open("data/posts.json", encoding="utf-8") as f:
    data = json.load(f)

posts = data["posts"]

def upload_to_instagram(image_url, caption):
    # 1️⃣ 미디어 컨테이너 생성
    r = requests.post(
        f"{GRAPH_URL}/{IG_USER_ID}/media",
        data={
            "image_url": image_url,
            "caption": caption,
            "access_token": ACCESS_TOKEN
        }
    )
    r.raise_for_status()
    creation_id = r.json()["id"]

    # 2️⃣ 게시
    r = requests.post(
        f"{GRAPH_URL}/{IG_USER_ID}/media_publish",
        data={
            "creation_id": creation_id,
            "access_token": ACCESS_TOKEN
        }
    )
    r.raise_for_status()

for post in posts:
    publish_date = post["publish"]["date"]
    status = post["status"]

    if publish_date == today and not status["posted"]:
        print(f"📸 업로드 실행: {post['post_id']}")

        caption = post["content"]["caption"]
        hashtags = " ".join(f"#{h}" for h in post["content"]["hashtags"])
        full_caption = f"{caption}\n\n{hashtags}"

        upload_to_instagram(
            image_url=post["media"]["image_url"],
            caption=full_caption
        )

        # 상태 업데이트
        status["posted"] = True
        status["posted_at"] = datetime.now().isoformat()

# JSON 저장
with open("data/posts.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
