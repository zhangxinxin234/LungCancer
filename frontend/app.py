from flask import Flask, render_template, request, jsonify, redirect, url_for
import requests
from functools import wraps

app = Flask(__name__)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'token' not in request.cookies:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# API代理配置
BACKEND_URL = 'http://127.0.0.1:8603'  # 使用localhost地址访问本机后端服务

# 启用详细的请求调试
import logging
logging.basicConfig(level=logging.DEBUG)

@app.route('/api/v1/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy(path):
    url = f'{BACKEND_URL}/api/v1/{path}'
    print(f"代理请求到: {url}")  # 调试日志

    # 获取所有请求头
    headers = {key: value for (key, value) in request.headers if key != 'Host'}

    # 确保认证头部被传递
    if 'Authorization' in request.headers:
        print("发现认证令牌，将传递给后端")

    try:
        # 处理URL尾部的斜杠问题
        # 如果路径以斜杠结尾，尝试去掉斜杠再请求
        if path.endswith('/') and len(path) > 1:
            alternative_url = f'{BACKEND_URL}/api/v1/{path.rstrip("/")}'
            print(f"尝试替代URL (无尾部斜杠): {alternative_url}")

            # 转发请求到替代URL
            resp = requests.request(
                method=request.method,
                url=alternative_url,
                headers=headers,
                data=request.get_data(),
                cookies=request.cookies,
                allow_redirects=True)  # 允许重定向
        else:
            # 转发请求到原始URL
            resp = requests.request(
                method=request.method,
                url=url,
                headers=headers,
                data=request.get_data(),
                cookies=request.cookies,
                allow_redirects=True)  # 允许重定向

        print(f"后端响应状态码: {resp.status_code}")  # 调试日志
        # print(f"后端响应内容: {resp.text}")  # 调试日志

        # 如果是重定向响应，打印更多信息
        if resp.status_code in (301, 302, 303, 307, 308):
            print(f"重定向URL: {resp.headers.get('Location', '未提供')}")
            if resp.history:
                print(f"重定向历史: {[r.url for r in resp.history]}")

        # 返回响应
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for (name, value) in resp.raw.headers.items()
                  if name.lower() not in excluded_headers]

        # 确保设置正确的Content-Type
        headers_dict = dict(headers)
        if 'Content-Type' not in headers_dict and resp.content:
            headers.append(('Content-Type', 'application/json'))

        response = app.response_class(
            response=resp.content,
            status=resp.status_code,
            headers=headers
        )
        return response
    except Exception as e:
        print(f"代理请求出错: {str(e)}")  # 调试日志
        return jsonify({"error": str(e)}), 500

@app.route('/')
@login_required
def index():
    return render_template('patient_info.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/patient_info')
@login_required
def patient_info():
    return render_template('patient_info.html')

@app.route('/prescription')
@login_required
def prescription():
    return render_template('prescription.html')

@app.route('/repair')
@login_required
def repair():
    return render_template('repair.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8602)