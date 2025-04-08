# -*- coding: utf-8 -*-
# ---
# @File: update_patients.py
# @Time: 4月 07, 2025
# @Author: Zhang Xinxing
# —

import json
import sys
from pathlib import Path

# Add the project root directory to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.append(str(project_root))

from app.db.database import get_db
from app.models.patient import Patient
from app.models.repair_rule import RepairRule
from app.utils.tools import extract_prescriptions
from app.services.embeddings import get_embeddings, retrieve, rerank
from app.core.config import settings

import requests
class ChatVllm():
    def __init__(self, model="qwen2-7B-chat", port=7888, host="localhost", adapter=None):
        # 加载动作插入 lora 模型
        self.tokenizer = None
        self.model = model
        self.url = f"http://{host}:{port}/v1/chat/completions"
        self.headers = {"Content-Type": "application/json"}
        self.adapter = adapter

    def generate_stream(self, input, history, model=None, temperature=0.01, top_p=0.1):
        conversation = [{'role': 'system', 'content': 'You are a helpful assistant.'}]
        for query_h, response_h in history:
            conversation.append({'role': 'user', 'content': query_h})
            conversation.append({'role': 'assistant', 'content': response_h})
        conversation.append({'role': 'user', 'content': input})

        data = {
            "model": model if model else self.model,
            "stream": True,
            "top_p":top_p,
            "temperature": temperature,
            "messages": conversation,
        }

        response = requests.request("POST", self.url, headers=self.headers, json=data, stream=True)

        for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
            try:
                answer = json.loads(chunk[5:]).get("choices")
            except:
                break

            print(answer)
            try:
                yield [answer[0]['delta']['content'], 'answer']
            except:
                yield [answer[0]['delta']['reasoning_content'], 'reasoning']

    def generate(self, input, history, model=None, temperature=0.01, top_p=0.1, system="You are a helpful assistant."):
        conversation = [{'role': 'system', 'content': system}]
        for query_h, response_h in history:
            conversation.append({'role': 'user', 'content': query_h})
            conversation.append({'role': 'assistant', 'content': response_h})
        conversation.append({'role': 'user', 'content': input})

        data = {
            "model": model if model else self.model,
            "stream": False,
            "top_p":top_p,
            "temperature": temperature,
            "messages": conversation,
        }

        response = requests.request("POST", self.url, headers=self.headers, json=data, stream=True)
        response = json.loads(response.text).get("choices")[0]["message"]
        answer_reasoning = response["reasoning_content"]
        answer = response["content"]
        history.append((input, answer))
        return {"answer": answer, "reasoning": answer_reasoning, "history": history}

chat_llm = ChatVllm(model=settings.LLM_NAME, port=settings.LLM_PORT, host=settings.LLM_HOST, adapter=settings.LLM_ADAPTER)

def load_data(file_path):
    """Load data from JSON file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def create_patient(id, data, prescription_text, medicine_text):
    """Create patient record from data"""
    return Patient(
        id=id,
        diagnosis=data.get('西医诊断', ''),
        disease_stage=data.get('现病程阶段', ''),
        pathology_report=data.get('病理报告', ''),
        staging=data.get('分期', ''),
        tnm_staging=data.get('TNM分期', ''),
        lab_tests=data.get('实验室检查', ''),
        imaging_report=data.get('影像学报告', ''),
        symptoms=data.get('症状', ''),
        tongue=data.get('舌象', ''),
        pulse=data.get('脉象', ''),
        generated_prescription=prescription_text,
        generated_medicine=medicine_text,
        prescription=prescription_text,
        chinese_medicine=medicine_text
    )


def get_patient_info(patient: Patient) -> str:
    patient_str = f"""【患者信息】：
- 西医诊断：{patient.diagnosis.strip()}
- 现病程阶段：{patient.disease_stage.strip()}
- 病理报告：{patient.pathology_report.strip()}
- 分期：{patient.staging.strip()}
- TNM分期：{patient.tnm_staging.strip()}
- 实验室检查：{patient.lab_tests.strip()}
- 影像学报告：{patient.imaging_report.strip()}
- 症状：{patient.symptoms.strip()}
- 舌苔：{patient.tongue.strip()}
- 脉象：{patient.pulse.strip()}"""

    return patient_str

def clinical_pathway(patient_text: str, collection_name: str = "bge_2025_04_02_csco指南"):
    """
    生成临床路径
    """
    # 1. 生成患者的西医诊疗路径标签
    system = """你是一名肿瘤科智能助手，擅长根据非小细胞肺癌患者的结构化或半结构化病情信息，识别其所适配的西医诊疗路径标签，用于后续智能治疗推荐。请根据患者的治疗阶段、分期、症状、检查检验等信息，输出西医诊疗路径标签。

**要求**：
- 请从固定标签集中选择最合适的一条诊疗路径标签，只返回标签；
- 请确保输出的标签与患者信息匹配，不要随意生成标签；
- 请确保输出的标签格式正确，不要包含多余信息。
"""
    prompt_user = f"""请从以下固定标签集中，选择**最合适的一条诊疗路径标签**，只返回标签。

【标签集合（共33项）】：
- IA、IB期NSCLC
- IA、IIB期NSCLC
- 可手术临床ⅢA和ⅢB(T3N2M0) NSCLC
- 不可切除ⅢA期、ⅢB期、ⅢC期NSCLC
- Ⅳ期 EGFR 敏感突变 NSCLC 一线治疗
- IV期EGFR20外显子插入突变NSCLC一线治疗
- IV期EGFR敏感突变NSCLC耐药后治疗
- IV期EGFR敏感突变NSCLC靶向及含铂双药失败后治疗
- IV期EGFR20外显子插入突变后线治疗
- IV期ALK融合NSCLC一线治疗
- IV期ALK融合NSCLC靶向后线治疗
- IV期ALK融合NSCLC靶向及含铂双药失败后治疗
- IV期ROSI融合NSCLC一线治疗
- IV期ROSI融合NSCLC二线治疗
- IV期ROSI融合NSCLC三线治疗
- IV期BRAF V600E 突变NSCLC
- IV期NTRK融合NSCLC
- IV期MET 14 外显子跳跃突变NSCLC
- IV期 RET融合 NSCLC
- IV期KRAS G12C/HER-2突变NSCLC
- IV期BRAFV600突变NTRK融合 NSCLC的后线治疗
- IV期MET14外显子跳跃突变NSCLC的后线治疗
- IV期RET融合NSCLC 的后线治疗
- IV期KRASGI2C突变NSCLC的后线治疗
- IV期HER-2 突变NSCLC 的后线治疗
- IV期无驱动基因、非鳞癌NSCLC一线治疗
- IV期无驱动基因、非鳞癌NSCLC二线治疗
- IV期无驱动基因、非鳞癌NSCLC三线治疗
- IV期无驱动基因、鳞癌一线治疗
- IV期无驱动基因、鳞癌二线治疗
- IV期无驱动基因、鳞癌三线治疗
- 孤立性脑或孤立性肾上腺转移
- 孤立性骨转移

{patient_text}

【示例输出格式】：
示例1. 匹配标签（从上述33个中选一条）：
Ⅳ期 EGFR 敏感突变 NSCLC 一线治疗

示例2. 匹配标签（从上述33个中选一条）：
IV期EGFR敏感突变NSCLC耐药后治疗

示例3. 匹配标签（从上述33个中选一条）：
IV期无驱动基因、鳞癌三线治疗

【请输出】只返回标签，不生成任何解释：
匹配标签（从上述33个中选一条）：
"""
    clinical_path = chat_llm.generate(input=prompt_user, history=[], model=settings.LLM_NAME, system=system)
    clinical_path = clinical_path.get('answer', '').replace("匹配标签（从上述33个中选一条）：", "").strip()
    print(f"临床路径-分层: {clinical_path}")

    # 2. 用诊疗路径检索csco指南
    clinical_embedding = get_embeddings([clinical_path])["embed_list"]
    retrieve_result = retrieve(
        clinical_embedding,
        collection_name=collection_name,
        topk=8
    )
    # 3. 重新排序
    results = rerank(
        query=clinical_path,
        candidates=retrieve_result["candidates"],
        para_info=retrieve_result["para_info"],
        threshold=0,
        num_candidates=3,
        return_infos=True
    )
    candi_doc_md = results["candi_doc"][0]["content"]

    # print(f"临床路径: {candi_doc_md}")

    return clinical_path, candi_doc_md

def batch_import(json_file):
    """Batch import data from JSON file to database"""
    # Load data
    data = load_data(json_file)
    print(f"Loaded {len(data)} records from {json_file}")

    # Get database session
    db = next(get_db())
    id = 1
    try:
        # Process each record
        for record in data["infos"]:

            pred_str = record["pred_data"]

            # 提取处方和中成药
            prescription_list, medicine_list, prescription_text, medicine_text = extract_prescriptions(pred_str)

            patient_data = db.query(Patient).filter(Patient.id == id).first()
            if not patient_data:
                # Create patient
                print(f"Patient ID {id} not found, creating new patient record.")
                patient_data = create_patient(id, record["raw_data"], prescription_text, medicine_text)

                # 获取患者信息
                patient_str = get_patient_info(patient_data)

                # 获取临床路径
                clinical_path, candi_doc_md = clinical_pathway(patient_str)

                # 更新患者的临床路径信息
                patient_data.western_treatment_stage = clinical_path
                patient_data.csco_guideline = candi_doc_md

            else:
                print(f"Patient ID {id} already exists, updating existing record.")
                patient_data.generated_prescription = prescription_text
                patient_data.generated_medicine = medicine_text
                patient_data.prescription = prescription_text
                patient_data.chinese_medicine = medicine_text


            db.add(patient_data)
            db.commit()
            db.refresh(patient_data)

            db.flush()  # Get patient ID before creating prescription

            print(f"Successfully imported {id}|{len(data['infos'])} records")
            id += 1
        print(f"Successfully imported all records")

    except Exception as e:
        db.rollback()
        print(f"Error during import: {str(e)}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    # Get JSON file path from command line argument or use default
    # json_file = "/Users/zhangxinxin/CursorProject/LungCancer/backend/data/infer/pred_test_data_Qwen2.5-14B_cotrc_no_r8a16_20250402143857_results.json"
    json_file = "/home/ubuntu/remote/LungCancer_for_chuchu/部署/backend/data/infer/pred_test_data_Qwen2.5-14B_cotrc_no13_r8a16_20250408092045_results.json"
    # json_file = sys.argv[1] if len(sys.argv) > 1 else "backend/data/raw/2025_03_31_raw_test_data_num_379_ctx_2048.json"

    print(f"Starting import from {json_file}")
    batch_import(json_file)