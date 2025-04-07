from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import patients, prescriptions
from app.db.database import engine
from app.models.base import Base

# 创建数据库表
Base.metadata.create_all(bind=engine)

app = FastAPI()

# 配置CORS
origins = [
    "http://localhost:5001",
    "http://127.0.0.1:5001",
    "http://0.0.0.0:5001",
    # 允许特定的局域网IP访问
    "http://192.168.31.98:5001",
    # 允许所有来源，仅在开发环境使用
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含路由
app.include_router(patients.router, prefix="/api/v1", tags=["patients"])
app.include_router(prescriptions.router, prefix="/api/v1", tags=["prescriptions"])

@app.get("/")
async def root():
    return {"message": "Welcome to Lung Cancer TCM Diagnosis System"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)