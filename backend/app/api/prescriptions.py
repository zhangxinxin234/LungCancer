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