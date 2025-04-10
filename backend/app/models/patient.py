from sqlalchemy import Column, Integer, String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    patient_id = Column(Integer)  # 每个用户的患者从0开始计数的ID

    # 添加联合唯一约束，确保每个用户的patient_id是唯一的
    __table_args__ = (
        UniqueConstraint('user_id', 'patient_id', name='unique_patient_id_per_user'),
    )
    diagnosis = Column(String(255))  # 西医诊断
    disease_stage = Column(String(255))  # 现病程阶段
    pathology_report = Column(Text)  # 病理报告
    staging = Column(String(255))  # 分期
    tnm_staging = Column(String(255))  # TNM分期
    lab_tests = Column(Text)  # 实验室检查
    imaging_report = Column(Text)  # 影像学报告
    symptoms = Column(Text)  # 症状
    tongue = Column(String(255))  # 舌苔
    pulse = Column(String(255))  # 脉象
    prescription = Column(Text)  # 处方
    chinese_medicine = Column(Text)  # 中成药
    generated_prescription = Column(Text)  # 生成处方
    generated_medicine = Column(Text)  # 生成中成药
    prescription_repair = Column(Text)  # 处方修复
    medicine_repair = Column(Text)  # 中成药修复
    western_treatment_stage = Column(String(255))  # 西医诊疗分期
    csco_guideline = Column(Text)  # 西医标准诊疗方案CSCO指南
    doctor_comment = Column(Text)  # 医师评价

    # 关系
    repair_rules = relationship("RepairRule", back_populates="patient", foreign_keys="RepairRule.patient_id")
    user = relationship("User", back_populates="patients")