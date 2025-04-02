# -*- coding: utf-8 -*-
# ---
# @File: main.py
# @Time: 4月 02, 2025
# @Author: Zhang Xinxing
# —
import sys
import os
sys.path.append(os.path.dirname(__file__))
# sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from fastapi import FastAPI
from fastapi import APIRouter
from fastapi.middleware.cors import CORSMiddleware

from api import generate

api_router = APIRouter()

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

api_router.include_router(
    generate.router,
    prefix="/generate",
    tags=["generate for chuchu"]
)


app = FastAPI(
    title="TCM Prescription Generation System",
    description="TCM Prescription Generation System for Chuchu"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api_router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)