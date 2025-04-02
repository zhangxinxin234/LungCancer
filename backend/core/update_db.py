# -*- coding: utf-8 -*-
# ---
# @File: update_db.py
# @Time: 4月 02, 2025
# @Author: Zhang Xinxing
# —
import os
import json
import requests
from backend.core.config import settings, BASE_DIR
from backend.core.embeddings import get_embeddings
import pandas as pd
from tabulate import tabulate


def load_jsonl(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        data_list = []
        for line in f:
            data_list.append(json.loads(line))
    return data_list

def create_collection(collection_name, host=settings.EMB_HOST, port=settings.EMB_PORT):
    url = f"http://{host}:{port}/v1/collections/create"
    data = {
              "collection_name": collection_name
            }
    headers = {'x-api-key': 'zhilan@123', 'Content-Type': 'application/json'}
    response = requests.request("POST", url, headers=headers, json=data, stream=False)

    result = response.json()
    return result

def delete_collection(collection_name, host=settings.EMB_HOST, port=settings.EMB_PORT):
    url = f"http://{host}:{port}/v1/collections/delete"
    data = {
              "collection_name": collection_name
            }
    headers = {'x-api-key': 'zhilan@123', 'Content-Type': 'application/json'}
    response = requests.request("POST", url, headers=headers, json=data, stream=False)

    result = response.json()
    return result

def update_db(texts_embs, texts_ids, texts, metadatas, collection_name, host=settings.EMB_HOST, port=settings.EMB_PORT):
    url = f"http://{host}:{port}/v1/collections/update"
    data = {
              "texts_embs": texts_embs,
              "texts_ids": texts_ids,
              "texts": texts,
              "metadatas": metadatas,
              "collection_name": collection_name
            }
    headers = {'x-api-key': 'zhilan@123', 'Content-Type': 'application/json'}
    response = requests.request("POST", url, headers=headers, json=data, stream=False)

    result = response.json()
    return result

def format_content(data: list):
    # 解析为 DataFrame 列表
    tables = []
    for section in data:
        for title, entries in section.items():
            df = pd.DataFrame(entries)
            df.insert(0, "分组", title)
            tables.append(df)

    # 合并所有表格
    full_table = pd.concat(tables, ignore_index=True)

    return tabulate(full_table, headers="keys", tablefmt="github")


def data_loader_fun(raw_data_path, colletion_type):
    if os.path.isfile(raw_data_path):
        doc_names = [raw_data_path.split("/")[-1]]
        raw_data_path = raw_data_path.replace(doc_names[0], "")
    elif os.path.isdir(raw_data_path):
        doc_names = os.listdir(raw_data_path)
    else:
        raise ValueError(f"raw_data_path must be a file or a directory, but got {raw_data_path} !!!")

    all_data_list = []
    for doc_name in doc_names:
        all_data_list.extend(load_jsonl(os.path.join(raw_data_path, doc_name)))
    # all_data_list = deduplicate_dict_list(all_data_list)
    print(f"数据去重完毕")
    print(f"去重后数据量：{len(all_data_list)}")

    all_data_dict = {d["id"]: d for d in all_data_list}

    texts_ids, texts, metadatas = [], [], []
    idx = 0
    for document_infos in all_data_list:
        try:
            doc_db_cls = "csco指南"
            doc_disease = "非小细胞肺癌"
            doc_query = document_infos.get("分期", "")
            doc_refer_id = document_infos.get("参考id", "")

            doc_content = [{doc_query: document_infos.get("分层内容", "")}]

            if doc_refer_id:
                doc_content = [{doc_query: document_infos.get("分层内容", "")}]
                for refer_id in doc_refer_id.split("，"):
                    if all_data_dict[refer_id].get("参考id", ""):
                        print("参考id:", all_data_dict[refer_id].get("参考id", ""))

                    doc_content.append({all_data_dict[refer_id].get("分期", ""): all_data_dict[refer_id].get("分层内容", "")})

            doc_content = format_content(doc_content)
            print(doc_content)
            print("#" * 100)


            metadatas.append({
                "db_cls": doc_db_cls,
                "refer_id": doc_refer_id,
            })

            if colletion_type == "doc":
                if len(doc_content) <= 10:
                    metadatas.pop()
                    continue

                texts.append(doc_content)
                metadatas[-1].update({"document": doc_content,
                                      "query": doc_query})

                texts_ids.append(doc_disease + str(idx))
                idx += 1

            elif colletion_type == "faq":
                if isinstance(doc_query, list):
                    for query in doc_query:
                        if query == "": continue
                        texts.append(query)
                        metadatas[-1].update({"document": query,
                                              "content": doc_content})

                        texts_ids.append(doc_disease + str(idx))
                        metadatas.append({
                            "db_cls": doc_db_cls,
                        })
                        idx += 1
                    metadatas = metadatas[:-1]
                else:
                    if doc_query == "":
                        metadatas.pop()
                        continue
                    texts.append(doc_query)
                    metadatas[-1].update({"document": doc_query,
                                          "content": doc_content})

                    texts_ids.append(doc_disease + str(idx))
                    idx += 1

            else:
                raise ValueError(f"colletion_type must be one of [doc, faq], but got {colletion_type} !!!")

        except KeyError as e:

            print(e)
            print(document_infos)

    assert len(texts_ids) == len(texts) == len(metadatas), \
        f"texts_ids:{len(texts_ids)}, texts:{len(texts)}, metadatas:{len(metadatas)}"
    print(f"最终的数据量：{len(texts_ids)}")
    return texts_ids, texts, metadatas


def pipeline(raw_data_path, colletion_type, collection_name, data_loader_fun, max_length):
    texts_ids, texts, metadatas = data_loader_fun(raw_data_path, colletion_type)

    print(delete_collection(collection_name))
    print(create_collection(collection_name))

    bsz = 1024 * 10  # ValueError: Batch size 194611 exceeds maximum batch size 41666   40960
    for i in range(0, len(texts), bsz):
        print(f"\t正在获取第{i}-{i + bsz}个文本的Embedding...")

        texts_embs = get_embeddings(data_list=texts[i:i + bsz],
                                    max_length=max_length,
                                    batch_size=16)["embed_list"]

        update_db(texts_embs=texts_embs,
                  texts_ids=texts_ids[i:i + bsz],
                  texts=texts[i:i + bsz],
                  metadatas=metadatas[i:i + bsz],
                  collection_name=collection_name)

    print(f"数据库({collection_name})内容已更新，{len(texts)}条数据已入库!")


if __name__ == '__main__':
    dir_test = "data/rag/csco指南.jsonl"

    raw_data_path = f"{BASE_DIR}/{dir_test}"

    texts_ids, texts, metadatas = data_loader_fun(raw_data_path, "faq")

    # data_list = [d["分期"] for d in load_jsonl(raw_data_path)]
    # data_list = "- " + "\n- ".join(data_list)
    # print(data_list)


    colletion_type = "faq"
    collection_name = "bge_2025_04_02_csco指南"
    pipeline(raw_data_path, colletion_type, collection_name, data_loader_fun, max_length=1024)
    # 数据库(bge_2025_04_02_csco指南)内容已更新，33条数据已入库!

    print("done !")