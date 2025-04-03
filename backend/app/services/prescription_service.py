from typing import Dict, Optional
from app.models.patient import Patient

class PrescriptionService:
    @staticmethod
    async def generate_prescription(patient: Patient) -> Dict[str, str]:
        """
        生成处方推荐和中成药推荐
        """
        # 这里应该调用实际的AI模型来生成处方
        # 目前使用模拟数据
        prescription_text = f"""太子参10g，焦白术10g，白芍10g，炒柴胡6g，元胡15g，肉苁蓉15g，玄参10g，黄精15g，浙贝10g，炒杜仲10g，川断10g，红景天18g，灵芝10g，半边莲15g，徐长卿15g，红豆杉6g"""
        
        medicine_text = """肺2膏、志苓胶囊"""
        
        western_treatment_stage = "IIIA期"
        csco_guideline = """
        | 分期 | 治疗方案 |
        |------|----------|
        | IIA期 | 手术切除 |
        | IIB期 | 手术切除+辅助化疗 |
        | IIIA期 | 新辅助化疗+手术切除 |
        """
        
        return {
            "prescription": prescription_text,
            "medicine": medicine_text,
            "western_treatment_stage": western_treatment_stage,
            "csco_guideline": csco_guideline
        }
    
    @staticmethod
    async def repair_prescription(
        patient: Patient,
        prescription: str,
        medicine: str,
        rules: Optional[str] = None
    ) -> Dict[str, str]:
        """
        修复处方和中成药
        """
        # 这里应该调用实际的AI模型来修复处方
        # 目前使用模拟数据
        repaired_prescription = f"""太子参10g，焦白术10g，白芍10g，炒柴胡6g，元胡15g，肉苁蓉15g，玄参10g，黄精15g，浙贝10g，炒杜仲10g，川断10g，红景天18g，灵芝10g，半边莲15g，徐长卿15g，红豆杉6g
        """
        
        repaired_medicine = """补中益气丸、丹参片"""
        
        return {
            "prescription": repaired_prescription,
            "medicine": repaired_medicine
        } 