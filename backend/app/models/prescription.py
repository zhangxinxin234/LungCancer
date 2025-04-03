from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    prescription_text = Column(Text)  # 处方内容
    medicine_text = Column(Text)  # 中成药内容
    western_treatment_stage = Column(String(255))  # 西医诊疗分期
    csco_guideline = Column(Text)  # CSCO指南内容
    repair_rules = Column(Text)  # 修复规则

    patient = relationship("Patient", back_populates="prescriptions") 