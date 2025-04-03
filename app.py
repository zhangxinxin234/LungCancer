from flask import Flask, render_template, request, jsonify, redirect, url_for
import json
import requests
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

@app.route('/')
def index():
    """显示输入表单页面"""
    return render_template('input.html')

@app.route('/generate', methods=['POST'])
def generate():
    """处理表单提交并显示结果页面"""
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

        # 渲染结果页面
        return render_template('result.html',
                          western_diagnosis=patient_info["西医诊断"],
                          current_stage=patient_info["现病程阶段"],
                          stage=patient_info["分期"],
                          tnm=patient_info["TNM分期"],
                          prescription=result.get('prescription', '无处方信息'),
                          medicine=result.get('medicine', '无中成药信息'),
                          clinical_cls=result.get('clinical_cls', '无西医诊疗分层信息'),
                          clinical_path=result.get('clinical_path', '无西医标准诊疗方案'),
                          patient_infos=json.dumps(patient_info))  # 添加 patient_infos 并转换为 JSON 字符串

    except Exception as e:
        error_message = str(e)
        app.logger.error(f"Error occurred: {error_message}")
        # 发生错误时返回输入页面并显示错误信息
        return render_template('input.html', error=error_message)

@app.route('/repair', methods=['POST'])
def repair():
    """处理修复请求"""
    try:
        # 获取前端发送的数据
        data = request.get_json()
        patient_infos = data.get('patient_infos', {})
        prescription = data.get('prescription', '')
        medicine = data.get('medicine', '')
        rules_text = data.get('rules_text', '')

        # 调用后端修复API
        app.logger.debug(f"Sending repair request to API with data: {data}")
        response = requests.post(
            'http://localhost:8001/api/v1/generate/repair',
            json={
                "patient_infos": patient_infos,
                "prescription": prescription,
                "medicine": medicine,
                "rules_text": rules_text
            }
        )
        app.logger.debug(f"API repair response status: {response.status_code}")
        result = response.json()
        app.logger.debug(f"API repair response content: {result}")

        # 返回修复结果
        return jsonify(result)

    except Exception as e:
        error_message = str(e)
        app.logger.error(f"Repair error occurred: {error_message}")
        return jsonify({"error": error_message}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0')