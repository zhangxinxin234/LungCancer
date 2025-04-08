from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from ..db.database import get_db
from ..models.patient import Patient
from ..models.user import User
from ..models.repair_rule import RepairRule
from ..services.prescription_service import PrescriptionService
from ..core.auth import get_current_active_user
from pydantic import BaseModel

class RepairRequest(BaseModel):
    rule_content: str

class DoctorCommentRequest(BaseModel):
    comment: str

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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 检查用户权限
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号未激活，无法生成处方"
        )

    # 查询患者并验证所属关系
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.user_id == current_user.id  # 确保患者属于当前用户
    ).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到患者或该患者不属于当前用户"
        )

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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 检查用户权限
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号未激活，无法修复处方"
        )

    # 查询患者并验证所属关系
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.user_id == current_user.id  # 确保患者属于当前用户
    ).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到患者或该患者不属于当前用户"
        )

    # 创建新的修复规则
    repair_rule = RepairRule(
        patient_id=patient_id,
        rule_content=repair_request.rule_content
    )
    db.add(repair_rule)

    result = await PrescriptionService.repair_prescription(
        patient=patient,
        prescription=patient.generated_prescription or patient.prescription,
        medicine=patient.generated_medicine or patient.chinese_medicine,
        rules=repair_request.rule_content
    )

    # 更新患者信息
    patient.prescription_repair = result["prescription"]
    patient.medicine_repair = result["medicine"]

    db.commit()

    return result

class AdoptRepairRequest(BaseModel):
    prescription: str
    medicine: str

@router.post("/patients/{patient_id}/adopt-repair")
async def adopt_repair(
    patient_id: int,
    repair_data: AdoptRepairRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 检查用户权限
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号未激活，无法采纳处方修复"
        )

    # 查询患者并验证所属关系
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.user_id == current_user.id  # 确保患者属于当前用户
    ).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到患者或该患者不属于当前用户"
        )

    # 使用前端传递的处方和中成药更新
    patient.prescription = repair_data.prescription
    patient.chinese_medicine = repair_data.medicine

    db.commit()

    return {
        "message": "Repair adopted successfully",
        "prescription": patient.prescription,
        "medicine": patient.chinese_medicine
    }

@router.get("/patients/{patient_id}/latest-repair-rule")
async def get_latest_repair_rule(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 检查用户权限
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号未激活，无法获取修复规则"
        )

    # 验证患者是否属于当前用户
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.user_id == current_user.id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到患者或该患者不属于当前用户"
        )

    # 获取最新的修复规则
    latest_rule = db.query(RepairRule).filter(RepairRule.patient_id == patient_id).order_by(RepairRule.id.desc()).first()

    if not latest_rule:
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 检查用户权限
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号未激活，无法保存修复规则"
        )

    # 验证患者是否属于当前用户
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.user_id == current_user.id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到患者或该患者不属于当前用户"
        )

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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 检查用户权限
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号未激活，无法获取处方"
        )

    # 查询患者并验证所属关系
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.user_id == current_user.id  # 确保患者属于当前用户
    ).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到患者或该患者不属于当前用户"
        )

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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 检查用户权限
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号未激活，无法更新处方"
        )

    # 查询患者并验证所属关系
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.user_id == current_user.id  # 确保患者属于当前用户
    ).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到患者或该患者不属于当前用户"
        )

    # 更新患者的处方信息
    # patient.western_treatment_stage = prescription_update.western_treatment_stage
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

@router.post("/patients/{patient_id}/save-doctor-comment")
async def save_doctor_comment(
    patient_id: int,
    comment_request: DoctorCommentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 检查用户权限
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号未激活，无法保存医生评论"
        )

    # 查询患者并验证所属关系
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.user_id == current_user.id  # 确保患者属于当前用户
    ).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到患者或该患者不属于当前用户"
        )
        raise HTTPException(status_code=500, detail=str(e))

    patient.doctor_comment = comment_request.comment

    try:
        db.commit()
        return {"message": "Doctor comment saved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))