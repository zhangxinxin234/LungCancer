from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import patients, prescriptions, repair_rules
from app.db.database import engine
from app.models.base import Base

# 创建数据库表
Base.metadata.create_all(bind=engine)

app = FastAPI()

# 配置CORS
origins = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
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
app.include_router(repair_rules.router, prefix="/api/v1", tags=["repair_rules"])

@app.get("/")
async def root():
    return {"message": "Welcome to Lung Cancer TCM Diagnosis System"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)