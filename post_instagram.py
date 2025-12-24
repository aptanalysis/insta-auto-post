import os
import json
import requests
from datetime import date

ACCESS_TOKEN = os.environ["IG_ACCESS_TOKEN"]
IG_USER_ID = os.environ["IG_USER_ID"]

GRAPH_URL = "https://graph.facebook.com/v19.0"

today = date.today().isoformat()

with open("data/posts.json", encoding="utf-8") as f:
    posts = json.load(f)

def upload_to_instagram(image_url, caption):
    # 1. 미디어 컨테이너 생성
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

    # 2. 게시
    r = requests.post(
        f"{GRAPH_URL}/{IG_USER_ID}/media_publish",
        data={
            "creation_id": creation_id,
            "access_token": ACCESS_TOKEN
        }
    )
    r.raise_for_status()

for post in posts:
    if post["publish_date"] == today and not post["posted"]:
        print("📸 인스타그램 업로드 실행")

        upload_to_instagram(
            image_url=post["image_path"],
            caption=post["caption"]
        )

        post["posted"] = True

# 업로드 상태 반영
with open("data/posts.json", "w", encoding="utf-8") as f:
    json.dump(posts, f, ensure_ascii=False, indent=2)
