# Flask 应用 Docker 部署说明

## 前置条件

1. 安装 Docker
```bash
curl -fsSL https://get.docker.com | sh
```

2. 安装 Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/download/v2.5.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## 部署步骤

1. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 修改环境变量（设置安全的密码和密钥）
vim .env
```

2. 构建和启动服务
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d
```

3. 执行数据库迁移（如果需要）
```bash
docker-compose exec web flask db upgrade
```

## 维护命令

1. 查看服务状态
```bash
docker-compose ps
```

2. 查看应用日志
```bash
docker-compose logs -f web
```

3. 重启服务
```bash
docker-compose restart
```

4. 停止服务
```bash
docker-compose down
```

5. 备份数据库
```bash
docker-compose exec db mysqldump -u root -p lungcancer > backup.sql
```

## 注意事项

1. 确保 `.env` 文件中的密码和密钥安全且复杂
2. 生产环境中建议使用 HTTPS
3. 定期备份数据库
4. 监控服务器资源使用情况

## 常见问题解决

1. 如果应用无法启动，检查日志：
```bash
docker-compose logs web
```

2. 如果数据库连接失败：
- 检查环境变量配置
- 确保数据库容器正在运行
- 验证数据库密码正确

3. 如果需要进入容器调试：
```bash
docker-compose exec web bash
```

## 性能优化建议

1. 调整 Gunicorn 工作进程数
2. 配置 Redis 缓存
3. 优化数据库查询
4. 使用连接池
5. 配置合适的容器资源限制 