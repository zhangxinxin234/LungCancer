from flask import Flask, render_template, request, jsonify
import json
import requests
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        # 收集表单数据
        patient_info = {
            "西医诊断": request.form.get('western_diagnosis', ''),
            "现病程阶段": request.form.get('current_stage', ''),
            "病理报告": request.form.get('pathology', ''),
            "分期": request.form.get('stage', ''),
            "TNM分期": request.form.get('tnm', ''),
            "实验室检查": request.form.get('lab_tests', ''),
            "影像学报告": request.form.get('imaging', ''),
            "症状": request.form.get('symptoms', ''),
            "舌象": request.form.get('tongue', ''),
            "脉象": request.form.get('pulse', '')
        }

        try:
            # 调用后端API
            app.logger.debug(f"Sending request to API with data: {patient_info}")
            response = requests.post(
                'http://localhost:8001/api/v1/generate/',
                json={"patient_infos": patient_info, "use_repairs": True}
            )
            app.logger.debug(f"API response status: {response.status_code}")
            result = response.json()
            app.logger.debug(f"API response content: {result}")

            # 如果是AJAX请求，返回JSON格式的响应
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                response_data = {
                    'prescription': result.get('prescription', '无处方信息'),
                    'medicine': result.get('medicine', '无中成药信息'),
                    'clinical_cls': result.get('clinical_cls', '无西医诊疗分层信息'),
                    'clinical_path': result.get('clinical_path', '无西医标准诊疗方案')
                }
                app.logger.debug(f"Sending JSON response: {response_data}")
                return jsonify(response_data)

            # 如果是普通表单提交，返回渲染后的模板
            return render_template('index.html',
                                prescription=result.get('prescription', ''),
                                medicine=result.get('medicine', ''),
                                clinical_cls=result.get('clinical_cls', ''),
                                clinical_path=result.get('clinical_path', ''))
        except Exception as e:
            error_message = str(e)
            app.logger.error(f"Error occurred: {error_message}")
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                app.logger.debug(f"Sending error response: {error_message}")
                return jsonify({'error': error_message}), 500
            return render_template('index.html', error=error_message)

    # GET请求返回空表单
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)