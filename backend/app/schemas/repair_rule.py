from pydantic import BaseModel

class RepairRuleBase(BaseModel):
    patient_id: int
    rule_content: str

class RepairRuleCreate(RepairRuleBase):
    pass

class RepairRule(RepairRuleBase):
    id: int

    class Config:
        orm_mode = True 