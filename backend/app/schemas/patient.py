from pydantic import BaseModel
from typing import Optional

class PatientBase(BaseModel):
    user_id: Optional[int] = None
    diagnosis: Optional[str] = None
    disease_stage: Optional[str] = None
    pathology_report: Optional[str] = None
    staging: Optional[str] = None
    tnm_staging: Optional[str] = None
    lab_tests: Optional[str] = None
    imaging_report: Optional[str] = None
    symptoms: Optional[str] = None
    tongue: Optional[str] = None
    pulse: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class Patient(PatientBase):
    id: int
    prescription: Optional[str] = None
    chinese_medicine: Optional[str] = None
    generated_prescription: Optional[str] = None
    generated_medicine: Optional[str] = None
    prescription_repair: Optional[str] = None
    medicine_repair: Optional[str] = None
    western_treatment_stage: Optional[str] = None
    csco_guideline: Optional[str] = None
    doctor_comment: Optional[str] = None

    class Config:
        orm_mode = True

class PatientList(BaseModel):
    id: int
    diagnosis: Optional[str] = None
    disease_stage: Optional[str] = None

    class Config:
        orm_mode = True