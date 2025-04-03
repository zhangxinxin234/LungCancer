# -*- coding: utf-8 -*-
# ---
# @File: main.py
# @Time: 4月 02, 2025
# @Author: Zhang Xinxing
# —
import json
from .config import settings
from .llm_service import chat_llm
from .tools import extract_prescriptions
from .embeddings import get_embeddings, retrieve, rerank

def get_patient_info(patient_info:dict):
    patient_str = f"""【患者信息】：
- 西医诊断：{patient_info.get('西医诊断', '').strip()}
- 现病程阶段：{patient_info.get('现病程阶段', '').strip()}
- 病理报告：{patient_info.get('病理报告', '').strip()}
- 分期：{patient_info.get('分期', '').strip()}
- TNM分期：{patient_info.get('TNM分期', '').strip()}
- 实验室检查：{patient_info.get('实验室检查', '').strip()}
- 影像学报告：{patient_info.get('影像学报告', '').strip()}
- 症状：{patient_info.get('症状', '').strip()}
- 舌苔：{patient_info.get('舌象', '').strip()}
- 脉象：{patient_info.get('脉象', '').strip()}"""

    return patient_str


async def generate_prescription_and_cmedcine(patient_text:str):
    """
    生成处方推荐和中成药推荐
    """
    system = """你是一名中医药智能助手，擅长结合现代医学信息和中医辨证理论，为非小细胞肺癌患者推荐中医处方和中成药。请根据患者的治疗阶段、分期、症状、体质等信息，输出中医处方和中成药推荐。

【输出格式】：
1. 中医处方：药物名称+剂量，逗号分隔。
2. 中成药推荐：多个用顿号分隔。

不要输出多余内容，不要解释理由。
"""

    prompt_user = f"""{patient_text}

【请输出以下内容】：
1. 中医处方：
2. 中成药推荐：
"""

    pred_str = await chat_llm.generate(input=prompt_user, history=[], model=settings.LLM_ADAPTER, system=system)
    pred_str = pred_str.get('answer', '')

    # 提取处方和中成药
    pred_prescription_list, pred_medicine_list, prescription_text, medicine_text = extract_prescriptions(pred_str)
    print(f"处方  pred: {prescription_text}")
    print(f"中成药 pred: {medicine_text}")

    return prescription_text, medicine_text


async def system_repair(patient_text: str, pred_prescription: str, pred_medicine: str, rules_text: str=None):
    system= """你是一名资深的中医药智能诊疗助手，擅长根据非小细胞肺癌患者的病情信息与中医药治疗经验，对模型初步生成的中医处方和中成药推荐结果进行修复和优化。只返回修复后的中医处方和中成药推荐，不返回任何解释。"""

    # 1. 模型初步输出
    model_text = f"""【系统初步推荐】
1. 中医处方：
{pred_prescription}

2. 中成药推荐：
{pred_medicine}"""

    # 2. 修复规则
    if rules_text is None:
        rules_text = """1. 放疗阶段需加：天冬12g、麦冬12g；
2. 化疗阶段需加：半夏12g、竹茹15g、阿胶珠6g；
3. 靶向治疗阶段加：生黄芪15g、炒白术12g、防风10g；
4. 所有阶段可加：红景天12g、灵芝15g、鸡血藤15g、白芍12g；
5. 恶性程度高（如Ki-67高、肿瘤标志物升高、淋巴转移）可加：山慈菇6g、红豆杉6g、重楼10g、猫抓草10g；
6. 脑转移：加钩藤12g、川牛膝10g、益智仁10g、猪苓15g、茯苓12g；
7. 肺部感染：蒲公英15g、银花12g；
8. 胸水：猪苓15g、茯苓12g；
9. 腹泻轻度：芡实15g，重度：诃子10g；
10. 腹胀：枳壳10g、大腹皮10g；
11. 失眠：炒枣仁10g、柏子仁10g；
12. 体虚或恶病质：加太子参15g或西洋参10g；
13. 护胃需求：可加露蜂房10g；
14. 中成药推荐，最多推荐两个：
    - 首推：
        - 肺1膏：适用于Ia期、轻症、稳定期；
        - 肺2膏：适用于II-IV期、进展期、转移；
    - 其次：
        - 西黄解毒丸：热毒壅盛、进展迅速；
        - 肺瘤平片、川贝粉：咳嗽痰多、痰湿壅肺；
        - 生血宝合剂：化疗后气血亏；
        - 贞芪扶正颗粒：体虚明显、纳差；
        - 血府逐瘀类：舌暗瘀斑、舌下静脉怒张。
"""

    # 3. 修复指令部分
    instruction_text = """【任务说明】
请根据以下规则提示，对模型初步生成的推荐结果进行分析、判断，并**执行必要的“加药、删药、替换中成药、保留合理用药”等修复动作**。

注意：
- 请基于病人实际病情、舌脉症状、分期和治疗阶段判断模型推荐的合理性；
- **不是所有规则命中的药物都要加入**，仅补加关键缺失药或明显不符药；
- 中成药推荐如与病情不符，可进行替换或补充；
- 输出前请确保处方结构完整、药量合理、逻辑清晰；
- 输出需简明、规范，便于系统结构化处理。


【规则提示】
""" + rules_text.strip()

    # 4. 最终拼接
    full_prompt = f"""{instruction_text}


{patient_text}


{model_text}

请**严格**按照【系统初步推荐】的格式输出，不返回任何解释：
1. 修复后的中医处方：
药物名称+剂量，逗号分隔。

2. 修复后的中成药推荐：
多个用顿号分隔。


【修复后的结果】
"""

    pred_str = await chat_llm.generate(input=full_prompt, history=[], model=settings.LLM_NAME, system=system)
    pred_str = pred_str.get('answer', '')
    print("\n", "=" * 150)

    # 提取处方和中成药
    pred_prescription_list, pred_medicine_list, prescription_text, medicine_text = extract_prescriptions(pred_str)
    print(f"修复后的处方  pred: {prescription_text}")
    print(f"修复后的中成药 pred: {medicine_text}")

    return pred_str, prescription_text, medicine_text


async def clinical_pathway(patient_text:str, collection_name:str = "bge_2025_04_02_csco指南"):
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
    clinical_path = await chat_llm.generate(input=prompt_user, history=[], model=settings.LLM_NAME, system=system)
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

    print(f"临床路径: {candi_doc_md}")

    return clinical_path, candi_doc_md


async def main(patient_info:dict, use_repair:bool=False, rules_text:str=None):
    # 1. 生成患者信息
    patient_str = get_patient_info(patient_info)

    # 2. 生成处方和中成药
    prescription_text, medicine_text = await generate_prescription_and_cmedcine(patient_str)

    # 3. 修复生成的处方和中成药
    if use_repair:
        pred_str, prescription_text, medicine_text = await system_repair(
            patient_str, pred_prescription=prescription_text, pred_medicine=medicine_text, rules_text=rules_text
        )

    # 4. 生成临床路径
    clinical_cls, clinical_path = await clinical_pathway(patient_str)

    # 5. 直接返回符合前端需求的数据格式
    result = {
        "prescription": prescription_text,
        "medicine": medicine_text,
        "clinical_path": clinical_path,
        "clinical_cls": clinical_cls
    }

    print("~" * 150)
    return result




