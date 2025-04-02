# 肺癌中医诊疗智能辅助系统

## 主要功能
这是一个基于 FastAPI 和 Flask 开发的肺癌中医诊疗智能辅助系统，主要提供以下功能：

- 中医处方生成：根据患者信息生成个性化的中药处方
- 中成药推荐：为患者推荐合适的中成药
- 处方修复优化：对生成的处方进行智能修复和优化
- 临床路径推荐：基于CSCO指南为患者匹配合适的临床诊疗路径

## 快速开始

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 启动系统
方式一：使用一键启动脚本（推荐）
```bash
python run.py
```

方式二：分别启动前后端
```bash
# 终端1：启动后端服务
python backend/main.py

# 终端2：启动前端服务
python app.py
```

### 3. 访问系统
- 前端界面：http://localhost:5000
- 后端API：http://localhost:8001

## 系统架构
- 前端：Flask框架，提供用户友好的Web界面
- 后端：FastAPI框架，提供高性能的API服务

### 前端功能
- 用户信息输入表单
- 处方生成结果展示
- 中成药推荐显示
- 临床路径建议展示

### 后端功能
- API层：处理HTTP请求
- 核心层：实现业务逻辑
- 配置管理：独立的配置模块

## API接口
主要提供以下API端点：
- `/api/v1/health`：健康检查接口
- `/api/v1/generate/`：处方生成接口

## 技术特点
- 模块化设计
- 前后端分离架构
- 安全性考虑：
  - CORS跨域支持
  - 异常处理机制
  - 请求日志记录
- 可扩展性：
  - 支持向量存储
  - 支持模型服务调用
  - 支持规则系统扩展

## 注意事项
1. 确保所有依赖包都已正确安装
2. 前后端服务需要同时运行
3. 检查端口（5000和8001）是否被占用

这是一个专业的医疗辅助决策系统，将中医理论与现代技术相结合，通过AI技术辅助医生进行诊疗决策。系统特别关注了肺癌患者的个性化治疗需求，并通过处方修复机制确保用药安全性。