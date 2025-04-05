# -*- coding: utf-8 -*-
# ---
# @File: tools.py
# @Time: 4月 05, 2025
# @Author: Zhang Xinxing
import json
import pandas as pd
from tabulate import tabulate

def format_content(data: list):
    # 解析为 DataFrame 列表
    tables = []
    for section in data:
        for idx, (title, entries) in enumerate(section.items()):
            df = pd.DataFrame(entries)
            value = [title] + [""] * (len(entries)-1)
            df.insert(0, "分期", value)

            tables.append(df)

    # 合并所有表格
    full_table = pd.concat(tables, ignore_index=True)

    return tabulate(full_table, headers="keys", tablefmt="github")


def load_json(file_path):
    """
    Load a JSON file and return its content.

    :param file_path: Path to the JSON file
    :return: Content of the JSON file
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

def save_json(data, file_path):
    """
    Save data to a JSON file.

    :param data: Data to save
    :param file_path: Path to the JSON file
    """
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def load_jsonl(file_path):
    """
    Load a JSONL file and return its content.

    :param file_path: Path to the JSONL file
    :return: Content of the JSONL file
    """
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            data.append(json.loads(line))
    return data

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



if __name__ == '__main__':
    data = load_jsonl("/Users/zhangxinxin/CursorProject/LungCancer/backend/data/rag/csco 指南 (7)_metadatas.jsonl")

    data_dict = {}
    for i in data:
        data_dict[i['document']] = i['content']

    save_json(data_dict, "/Users/zhangxinxin/CursorProject/LungCancer/backend/data/rag/csco 指南 (7)_metadatas.json")