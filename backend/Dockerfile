# 使用Python 3.11官方镜像作为基础镜像
FROM continuumio/miniconda3

# 配置中文环境
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
    PYTHONUNBUFFERED=1

# 复制requirements文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install -i https://mirrors.aliyun.com/pypi/simple --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8602

# 启动命令
CMD ["python", "app.py"]