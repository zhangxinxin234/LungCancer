# 使用多阶段构建，基础镜像为 Miniconda
FROM continuumio/miniconda3 AS base

# 配置中文环境和系统依赖
ENV LANG C.utf8
ENV LC_ALL C.utf8

RUN if [ -f /etc/apt/sources.list ]; then \
    sed -i 's/deb.debian.org/ftp.cn.debian.org/g' /etc/apt/sources.list && \
    sed -i 's/security.debian.org/ftp.cn.debian.org/g' /etc/apt/sources.list && \
    apt-get clean && apt-get update ;fi

RUN if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
    sed -i 's/deb.debian.org/ftp.cn.debian.org/g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's/security.debian.org/ftp.cn.debian.org/g' /etc/apt/sources.list.d/debian.sources && \
    apt-get clean && apt-get update ;fi

# 安装系统依赖和curl（用于健康检查）
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8602

# 复制后端和前端的 requirements 文件
COPY backend/requirements.txt backend_requirements.txt
COPY frontend/requirements.txt frontend_requirements.txt

# 安装 Python 依赖
RUN pip install -i https://mirrors.aliyun.com/pypi/simple --no-cache-dir -r backend_requirements.txt \
    && pip install -i https://mirrors.aliyun.com/pypi/simple --no-cache-dir -r frontend_requirements.txt

# 复制后端和前端的应用代码
COPY backend ./backend
COPY frontend ./frontend

# 创建非 root 用户
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# 暴露端口
EXPOSE ${PORT}

# 健康检查配置
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# 启动命令 - 同时启动后端和前端服务
CMD ["sh", "-c", "python backend/app/main.py & python frontend/app.py"]