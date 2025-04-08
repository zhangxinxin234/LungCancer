from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.patient import Patient as PatientModel
from app.models.repair_rule import RepairRule
from app.models.user import User
from app.schemas.patient import Patient, PatientCreate, PatientList
from app.core.auth import get_current_user

router = APIRouter()

@router.post("/patients/", response_model=Patient)
def create_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient_data = patient.dict()
    patient_data['user_id'] = current_user.id
    db_patient = PatientModel(**patient_data)
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@router.get("/patients/", response_model=List[PatientList])
def read_patients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 只返回当前用户的患者记录
    patients = db.query(PatientModel).filter(
        PatientModel.user_id == current_user.id
    ).offset(skip).all()
    return patients

@router.get("/patients/{patient_id}", response_model=Patient)
def read_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_patient = db.query(PatientModel).filter(
        PatientModel.id == patient_id,
        PatientModel.user_id == current_user.id
    ).first()
    if db_patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return db_patient

@router.put("/patients/{patient_id}", response_model=Patient)
def update_patient(
    patient_id: int,
    patient: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_patient = db.query(PatientModel).filter(
        PatientModel.id == patient_id,
        PatientModel.user_id == current_user.id
    ).first()
    if db_patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 获取要更新的数据，但不包括 user_id
    update_data = patient.dict(exclude={"user_id"})

    # 更新患者信息，但保留 user_id
    for key, value in update_data.items():
        setattr(db_patient, key, value)

    # 确保 user_id 是当前用户的 ID
    db_patient.user_id = current_user.id

    db.commit()
    db.refresh(db_patient)
    return db_patient


@router.delete("/patients/{patient_id}")
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 首先检查患者是否存在且属于当前用户
    db_patient = db.query(PatientModel).filter(
        PatientModel.id == patient_id,
        PatientModel.user_id == current_user.id
    ).first()
    if db_patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    try:
        # 删除相关的修复规则
        db.query(RepairRule).filter(RepairRule.patient_id == patient_id).delete()

        # 删除患者
        db.delete(db_patient)

        # 提交事务
        db.commit()

        return {"message": "Patient deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))