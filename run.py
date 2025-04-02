import subprocess
import sys
import time
import os

def run_backend():
    print("启动后端服务...")
    backend_process = subprocess.Popen([sys.executable, "backend/main.py"],
                                     stdout=subprocess.PIPE,
                                     stderr=subprocess.PIPE)
    return backend_process

def run_frontend():
    print("启动前端服务...")
    frontend_process = subprocess.Popen([sys.executable, "app.py"],
                                      stdout=subprocess.PIPE,
                                      stderr=subprocess.PIPE)
    return frontend_process

if __name__ == "__main__":
    # 启动后端
    backend_process = run_backend()

    # 等待几秒钟让后端完全启动
    print("等待后端服务启动...")
    time.sleep(5)

    # 启动前端
    frontend_process = run_frontend()

    print("服务已启动!")
    print("前端访问地址: http://localhost:5000")
    print("后端API地址: http://localhost:8001")
    print("按Ctrl+C停止服务...")

    try:
        # 保持脚本运行
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("正在停止服务...")
        backend_process.terminate()
        frontend_process.terminate()
        print("服务已停止!")