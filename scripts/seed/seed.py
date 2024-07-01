import asyncio
import os
from dotenv import load_dotenv
import httpx

async def post_content(path, parent_id, contentType, url):
    async with httpx.AsyncClient() as client:
        for index, filename in enumerate(os.listdir(path)):
            try:
                file_path = os.path.join(path, filename)
                text_content = f'This is text content. #{index}'
                files = {'file': (filename, open(file_path, 'rb'))}
                data = {'id': parent_id, 'text': text_content, 'type': contentType}
                print(f"Sending data: {data}")
                r = await client.post(url, files=files, data=data)
                print(r.text)
                print('\n')
            except Exception as e:
                print(f"Error sending file {filename}: {e}")
                print('\n')
            finally:
                files['file'][1].close()

async def main():
    load_dotenv()
    parent_id = os.getenv('PARENT_ID')
    url = os.getenv('URL')
    photos_path = os.path.join(os.path.dirname(__file__), 'photos')
    videos_path = os.path.join(os.path.dirname(__file__), 'videos')
    url = 'http://localhost:8080/posts'

    await post_content(photos_path, parent_id, 'photos', url)
    await post_content(videos_path, parent_id, 'videos', url)

if __name__ == "__main__":
    asyncio.run(main())