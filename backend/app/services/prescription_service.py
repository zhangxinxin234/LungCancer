from typing import Dict, Optional
from app.models.patient import Patient
from app.utils.tools import load_json, format_content

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

        western_treatment_stage = "IA、IIB期NSCLC"
        csco_guideline = await PrescriptionService.genetate_csco_guideline(western_treatment_stage)

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
        repaired_prescription = f"""太子参10g，焦白术10g，白芍10g，炒柴胡6g，元胡15g，肉苁蓉15g，玄参10g，黄精15g，浙贝10g，炒杜仲10g，川断10g，红景天18g，灵芝10g，半边莲15g，徐长卿15g，红豆杉6g，天苍苍，野茫茫，风吹草动"""

        repaired_medicine = """补中益气丸、丹参片"""

        return {
            "prescription": repaired_prescription,
            "medicine": repaired_medicine
        }

    @staticmethod
    async def genetate_csco_guideline(western_treatment_stage) -> str:
        """
        生成CSCO指南
        从/backend/data/rag/csco 指南 (7)_metadatas.json读取json信息

        """
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        file_path = os.path.join(base_dir, "data", "rag", "csco 指南 (7)_metadatas.json")
        csco_guideline = load_json(file_path)

        try:
            csco_guideline = csco_guideline[western_treatment_stage]
            # 保证是md格式
            csco_guideline = format_content(csco_guideline)
        except KeyError:
            csco_guideline = "没有找到相关的CSCO指南信息"

        # print(f"csco_guideline: {csco_guideline}")
        return csco_guideline
