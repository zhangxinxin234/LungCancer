# -*- coding: utf-8 -*-
# ---
# @File: tools.py
# @Time: 4月 02, 2025
# @Author: Zhang Xinxing
# —
import re

def extract_prescriptions(text):
    # 正则表达式匹配中医处方
    prescription_pattern = r"(?<=中医处方：\n)(.*)\n"
    # 正则表达式匹配中成药推荐
    medicine_pattern = r"(?<=中成药推荐：\n)(.*)"

    # 使用正则表达式查找匹配项
    prescription_match = re.search(prescription_pattern, text)
    medicine_match = re.search(medicine_pattern, text)

    # 初始化列表
    prescription_list = []
    medicine_list = []

    prescription_text = ""
    medicine_text = ""

    # 提取并处理处方
    if prescription_match:
        prescription_text = prescription_match.group(1)
        # 将处方中的药材分割并放入列表
        prescription_list = [item.strip() for item in prescription_text.split('，')]

    # 提取中成药
    if medicine_match:
        medicine_text = medicine_match.group(1)
        # 将中成药分割并放入列表（按+号分割）
        medicine_list = [item.strip() for item in medicine_text.split('、')]

    return prescription_list, medicine_list, prescription_text, medicine_text

def extract_ways(text):
    # 正则表达式匹配中医处方
    prescription_pattern = r"(?<=中医处方：\n)(.*)\n"
    # 正则表达式匹配中成药推荐
    medicine_pattern = r"(?<=中成药推荐：\n)(.*)"

    # 使用正则表达式查找匹配项
    prescription_match = re.search(prescription_pattern, text)
    medicine_match = re.search(medicine_pattern, text)

    # 初始化列表
    prescription_list = []
    medicine_list = []

    prescription_text = ""
    medicine_text = ""

    # 提取并处理处方
    if prescription_match:
        prescription_text = prescription_match.group(1)
        # 将处方中的药材分割并放入列表
        prescription_list = [item.strip() for item in prescription_text.split('，')]

    # 提取中成药
    if medicine_match:
        medicine_text = medicine_match.group(1)
        # 将中成药分割并放入列表（按+号分割）
        medicine_list = [item.strip() for item in medicine_text.split('、')]

    return prescription_list, medicine_list, prescription_text, medicine_text


