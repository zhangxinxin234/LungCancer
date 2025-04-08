# -*- coding: utf-8 -*-
# ---
# @File: config.py
# @Time: 4月 02, 2025
# @Author: Zhang Xinxing
# —
from pydantic_settings import BaseSettings
from functools import lru_cache

# 获取项目路径
import os
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
print(BASE_DIR)

class Settings(BaseSettings):
    PROJECT_NAME: str = "辨治非小细胞肺癌人工智能辅助诊疗系统"
    API_V1_STR: str = "/api/v1"

    # 文件存储配置
    STORAGE_DIR: str = os.path.join(BASE_DIR, "storage")

    # 嵌入服务配置
    # EMB_HOST: str = "192.168.31.230"
    EMB_HOST: str = "127.0.0.1"
    EMB_PORT: int = 7862
    EMB_SIZE: int = 1024

    # Qdrant配置
    # DB_HOST: str = "192.168.31.230"
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 6333
    DB_NAME: str = "bge_2025_04_02_csco指南"

    # LLM 服务配置
    LLM_HOST: str = "127.0.0.1"
    LLM_PORT: int = 7853
    LLM_NAME: str = "qwen-14b"
    LLM_ADAPTER: str = "Qwen2.5-14B_cotrc_no1_r8a16"



    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()