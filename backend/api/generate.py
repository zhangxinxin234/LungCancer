# -*- coding: utf-8 -*-
# ---
# @File: generate.py
# @Time: 4月 02, 2025
# @Author: Zhang Xinxing
# —
from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

import logging
logger = logging.getLogger(__name__)

router = APIRouter()

from core.main import main, system_repair, get_patient_info, clinical_pathway

class ChatRequest(BaseModel):
    patient_infos: Dict[str, Any] = Field(..., title="患者信息", description="患者信息")
    use_repairs: Optional[bool] = Field(False, title="是否使用修复", description="是否使用修复")
    rules_text: Optional[str] = Field(None, title="规则文本", description="规则文本")

class RepairRequest(BaseModel):
    patient_infos: Dict[str, Any] = Field(..., title="患者信息", description="患者信息")
    rules_text: Optional[str] = Field(None, title="规则文本", description="规则文本")
    prescription: str = Field(..., title="处方", description="需要修复的处方")
    medicine: str = Field(..., title="中成药", description="需要修复的中成药")

class ChatResponse(BaseModel):
    """聊天响应模型"""
    prescription: str = Field(..., description="处方内容")
    medicine: str = Field(..., description="中成药内容")
    clinical_cls: str = Field(..., description="西医标准诊疗方案-分期信息")
    clinical_path: str = Field(..., description="西医标准诊疗方案")

class RepairResponse(BaseModel):
    """聊天响应模型"""
    prescription: str = Field(..., description="处方内容")
    medicine: str = Field(..., description="中成药内容")

@router.post("/", response_model=ChatResponse, summary="处方推荐接口", description="根据患者信息生成中医处方、中成药推荐和西医标准诊疗方案")
async def chat(request: ChatRequest, http_request: Request):
    """
    根据患者信息生成处方推荐、中成药推荐和西医标准诊疗方案
    """
    client_ip = http_request.client.host if http_request.client else "unknown"

    try:
        print(f"收到处方推荐请求(IP: {client_ip})")
        logger.info(f"收到处方推荐请求(IP: {client_ip})")

        result = await main(
            patient_info=request.patient_infos, use_repair=False, rules_text=request.rules_text
        )

        # 假设 main 函数返回的是一个字典，包含所需的所有信息
        return ChatResponse(
            prescription=result.get("prescription", "无处方信息"),
            medicine=result.get("medicine", "无中成药信息"),
            clinical_path=result.get("clinical_path", "无西医标准诊疗方案"),
            clinical_cls=result.get("clinical_cls", "无西医诊疗分期信息"),
        )

    except Exception as e:
        logger.error(f"处理处方推荐请求失败: {str(e)}", exc_info=True)

        if isinstance(e, HTTPException):
            raise e

        raise HTTPException(status_code=500, detail=f"处理处方推荐请求失败: {str(e)}")

@router.post("/repair", response_model=RepairResponse, summary="修复接口", description="修复生成的处方、中成药推荐")
async def repair(request: RepairRequest, http_request: Request):
    """
    修复生成的处方、中成药推荐和西医标准诊疗方案
    """
    client_ip = http_request.client.host if http_request.client else "unknown"

    try:
        print(f"收到修复请求(IP: {client_ip})")
        logger.info(f"收到修复请求(IP: {client_ip})")

        result = await system_repair(
            patient_text=get_patient_info(request.patient_infos),
            pred_prescription = request.prescription,
            pred_medicine = request.medicine,
            rules_text = request.rules_text
        )

        return RepairResponse(
            prescription=result.get("prescription", "无处方信息"),
            medicine=result.get("medicine", "无中成药信息"),
        )

    except Exception as e:
        logger.error(f"处理修复请求失败: {str(e)}", exc_info=True)

        if isinstance(e, HTTPException):
            raise e

        raise HTTPException(status_code=500, detail=f"处理修复请求失败: {str(e)}")