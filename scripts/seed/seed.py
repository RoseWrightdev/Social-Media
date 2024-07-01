import os
import requests
from dotenv import load_dotenv


def post_content(path: str, parent_id: str):
  server_route = 'http://localhost:8080/'
  text_content = 'This is text content. #'
  for index, file in enumerate(os.listdir(path)):
    print(file)
    print(parent_id)
    print(text_content + str(index))
    print("\n")

if __name__ == "__main__":
  load_dotenv()
  parent_id = os.getenv('PARENT_ID')
  photos_path = os.path.join(os.path.dirname(__file__), 'photos')
  videos_path = os.path.join(os.path.dirname(__file__), 'videos')
  post_content(photos_path, parent_id)
  post_content(videos_path, parent_id)

