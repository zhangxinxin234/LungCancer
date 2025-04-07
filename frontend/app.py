from flask import Flask, render_template, request
import requests

app = Flask(__name__)

# API代理配置
BACKEND_URL = 'http://localhost:8000'

@app.route('/api/v1/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy(path):
    url = f'{BACKEND_URL}/api/v1/{path}'

    # 转发请求到后端API
    resp = requests.request(
        method=request.method,
        url=url,
        headers={key: value for (key, value) in request.headers if key != 'Host'},
        data=request.get_data(),
        cookies=request.cookies,
        allow_redirects=False)

    # 返回响应
    excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
    headers = [(name, value) for (name, value) in resp.raw.headers.items()
               if name.lower() not in excluded_headers]

    response = app.response_class(
        response=resp.content,
        status=resp.status_code,
        headers=headers
    )
    return response

@app.route('/')
def index():
    return render_template('patient_info.html')

@app.route('/patient_info')
def patient_info():
    return render_template('patient_info.html')

@app.route('/prescription')
def prescription():
    return render_template('prescription.html')

@app.route('/repair')
def repair():
    return render_template('repair.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)