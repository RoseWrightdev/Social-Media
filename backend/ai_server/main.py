from typing import Union
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# run server:
# uvicorn main:app --reload

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/test")
def read_root():
    return {
        "Port": "localhost:8080",
        "Status": "200"
            }

@app.get("/pyTest")
def read_root():
    return {
        "Port": "localhost:8080",
        "Status": "200"
            }
@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}