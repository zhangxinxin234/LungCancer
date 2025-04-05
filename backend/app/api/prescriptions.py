from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from ..db.database import get_db
from ..models.patient import Patient
from ..models.repair_rule import RepairRule
from ..services.prescription_service import PrescriptionService
from pydantic import BaseModel

class RepairRequest(BaseModel):
    rule_content: str

# 添加处方更新请求的模型
class PrescriptionUpdate(BaseModel):
    western_treatment_stage: str
    csco_guideline: str
    prescription: str
    medicine: str

router = APIRouter()

@router.post("/patients/{patient_id}/generate-prescription")
async def generate_prescription(
    patient_id: int,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    result = await PrescriptionService.generate_prescription(patient)
    
    # 更新患者信息
    patient.generated_prescription = result["prescription"]
    patient.generated_medicine = result["medicine"]
    patient.western_treatment_stage = result["western_treatment_stage"]
    patient.csco_guideline = result["csco_guideline"]
    patient.prescription = result["prescription"]
    patient.chinese_medicine = result["medicine"]
    
    db.commit()
    
    return result

@router.post("/patients/{patient_id}/repair-prescription")
async def repair_prescription(
    patient_id: int,
    repair_request: RepairRequest,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # 创建新的修复规则
    repair_rule = RepairRule(
        patient_id=patient_id,
        rule_content=repair_request.rule_content
    )
    db.add(repair_rule)
    
    result = await PrescriptionService.repair_prescription(
        patient=patient,
        prescription=patient.generated_prescription,
        medicine=patient.generated_medicine,
        rules=repair_request.rule_content
    )
    
    # 更新患者信息
    patient.prescription_repair = result["prescription"]
    patient.medicine_repair = result["medicine"]
    
    db.commit()
    
    return result

@router.post("/patients/{patient_id}/adopt-repair")
async def adopt_repair(
    patient_id: int,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # 将修复后的处方和中成药更新为当前处方和中成药
    patient.prescription = patient.prescription_repair
    patient.chinese_medicine = patient.medicine_repair
    
    db.commit()
    
    return {
        "message": "Repair adopted successfully",
        "prescription": patient.prescription,
        "medicine": patient.chinese_medicine
    }

@router.get("/patients/{patient_id}/latest-repair-rule")
async def get_latest_repair_rule(
    patient_id: int,
    db: Session = Depends(get_db)
):
    # 获取所有患者中最新的修复规则
    latest_rule = db.query(RepairRule)\
        .order_by(RepairRule.id.desc())\
        .first()
    
    if not latest_rule:
        # 如果没有找到规则，返回默认规则
        default_rule = """1. 放疗阶段需加：天冬12g、麦冬12g；
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
        - 血府逐瘀类：舌暗瘀斑、舌下静脉怒张。"""
        return {"rule_content": default_rule}
    
    return {"rule_content": latest_rule.rule_content}

@router.post("/patients/{patient_id}/save-repair-rule")
async def save_repair_rule(
    patient_id: int,
    repair_request: RepairRequest,
    db: Session = Depends(get_db)
):
    # 创建新的修复规则
    repair_rule = RepairRule(
        patient_id=patient_id,
        rule_content=repair_request.rule_content
    )
    db.add(repair_rule)
    db.commit()
    
    return {"message": "Repair rule saved successfully"}

@router.get("/patients/{patient_id}/prescription")
async def get_prescription(
    patient_id: int,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return {
        "prescription": patient.prescription,
        "medicine": patient.chinese_medicine,
        "western_treatment_stage": patient.western_treatment_stage,
        "csco_guideline": patient.csco_guideline
    }

@router.put("/patients/{patient_id}/prescription")
async def update_prescription(
    patient_id: int,
    prescription_update: PrescriptionUpdate,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # 更新患者的处方信息
    patient.western_treatment_stage = prescription_update.western_treatment_stage
    # patient.csco_guideline = prescription_update.csco_guideline
    patient.prescription = prescription_update.prescription
    patient.chinese_medicine = prescription_update.medicine
    
    try:
        db.commit()
        return {
            "message": "Prescription updated successfully",
            "prescription": patient.prescription,
            "medicine": patient.chinese_medicine,
            "western_treatment_stage": patient.western_treatment_stage,
            "csco_guideline": patient.csco_guideline
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) 