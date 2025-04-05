import requests
import logging
from typing import List, Dict
from app.core.config import settings
logger = logging.getLogger(__name__)

def get_embeddings(
    data_list: List[str],
    max_length: int = 1024,
    batch_size: int = 64,
    host: str = settings.EMB_HOST,
    port: int = settings.EMB_PORT
) -> Dict[str, List]:
    """
    从外部服务获取文本嵌入向量
    
    Args:
        data_list: 文本列表
        max_length: 最大文本长度
        batch_size: 批处理大小
        host: 服务主机地址
        port: 服务端口
    
    Returns:
        Dict: 包含嵌入向量的字典
    """
    try:
        url = f"http://{host}:{port}/v1/emb_models/get_embeddings"
        data = {
            "data_list": data_list,
            "max_length": max_length,
            "batch_size": batch_size
        }
        headers = {'x-api-key': 'zhilan@123', 'Content-Type': 'application/json'}
        response = requests.post(url, json=data, headers=headers, stream=False)
        response.raise_for_status()  # 检查响应状态
        
        return response.json()
        
    except Exception as e:
        logger.error(f"获取嵌入向量失败: {str(e)}")
        raise

def retrieve(
    data_list: List[List[float]],
    collection_name: str,
    topk: int = 8,
    host: str = settings.EMB_HOST,
    port: int = settings.EMB_PORT
) -> Dict:
    """
    检索相似向量
    
    Args:
        data_list: 查询向量列表
        collection_name: 集合名称
        topk: 返回最相似的k个结果
        host: 服务主机地址
        port: 服务端口
    
    Returns:
        Dict: 检索结果
    """
    try:
        url = f"http://{host}:{port}/v1/collections/query"
        data = {
            "query_embs": data_list,
            "collection_name": collection_name,
            "topk": topk
        }
        headers = {'x-api-key': 'zhilan@123', 'Content-Type': 'application/json'}
        response = requests.post(url, json=data, headers=headers, stream=False)
        response.raise_for_status()
        
        return response.json()
        
    except Exception as e:
        logger.error(f"检索向量失败: {str(e)}")
        raise


def rerank(query, candidates, para_info, max_length=512, batch_size=64, threshold=2.0, num_candidates=3, return_infos=False,
           host=settings.EMB_HOST, port=settings.EMB_PORT) -> Dict:
    url = f"http://{host}:{port}/v1/score_models/get_scores"
    data = {
              "query": query,
              "candidates": candidates,
              "para_info": para_info,
              "max_length": max_length,
              "batch_size": batch_size,
              "threshold": threshold,
              "num_candidates": num_candidates,
              "return_infos": return_infos
            }
    headers = {'x-api-key': 'zhilan@123', 'Content-Type': 'application/json'}
    response = requests.request("POST", url, headers=headers, json=data, stream=False)

    result = response.json()
    return result