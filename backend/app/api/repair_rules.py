from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.repair_rule import RepairRule
from app.schemas.repair_rule import RepairRuleCreate, RepairRule as RepairRuleSchema

router = APIRouter()

@router.post("/repair-rules/", response_model=RepairRuleSchema)
def create_repair_rule(repair_rule: RepairRuleCreate, db: Session = Depends(get_db)):
    db_repair_rule = RepairRule(
        patient_id=repair_rule.patient_id,
        rule_content=repair_rule.rule_content
    )
    db.add(db_repair_rule)
    db.commit()
    db.refresh(db_repair_rule)
    return db_repair_rule

@router.get("/repair-rules/{patient_id}", response_model=List[RepairRuleSchema])
def get_repair_rules(patient_id: int, db: Session = Depends(get_db)):
    repair_rules = db.query(RepairRule).filter(RepairRule.patient_id == patient_id).all()
    if not repair_rules:
        raise HTTPException(status_code=404, detail="Repair rules not found")
    return repair_rules 