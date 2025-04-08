#!/bin/bash

# 启动后端服务
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8603 &

# 启动前端服务
cd ../frontend
python app.py 