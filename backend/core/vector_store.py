from typing import List, Dict, Any

from qdrant_client import QdrantClient
from qdrant_client.http import models
from .config import settings

import logging
logger = logging.getLogger(__name__)

class VectorStore:
    def __init__(self):
        """初始化向量存储"""
        # 初始化Qdrant客户端
        self.client = QdrantClient(host=settings.DB_HOST, port=settings.DB_PORT)

    def is_exists(self, collection_name: str) -> bool:
        """检查集合是否存在"""
        collections = self.client.get_collections().collections
        return any(collection.name == collection_name for collection in collections)

    def delete_db(self, collection_name: str):
        """删除集合"""
        self.client.delete_collection(collection_name=collection_name)

    def create_db(self, collection_name: str):
        """创建新集合，如果不存在的话"""
        if not self.is_exists(collection_name):
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=1024,  # 根据实际embedding维度设置
                    distance=models.Distance.COSINE
                )
            )

    def update_db(self, embeddings, ids, texts, metadatas, collection_name: str, verbose: bool = False):
        """更新向量数据库"""
        try:
            # 确保集合存在
            self.create_db(collection_name)

            points = [
                models.PointStruct(
                    id=id,
                    vector=text_embedding,
                    payload=structure)
                for id, text_embedding, structure in zip(ids, embeddings, metadatas)
            ]

            self.client.upload_points(collection_name, points=points, batch_size=128)

            if verbose:
                logger.info(f"Successfully updated {len(points)} points")

        except Exception as e:
            logger.error(f"Error updating vector database: {str(e)}")
            raise e

    def delete_by_document_id(self, collection_name: str, doc_id: int, chunk_id_list: List[int]):
        """删除指定文档的所有向量"""
        try:
            self.client.delete(
                collection_name=collection_name,
                points_selector=models.PointIdsList(
                    points=chunk_id_list,
                ),
            )

            logger.info(f"成功删除文档 {doc_id} 的所有向量")
        except Exception as e:
            logger.error(f"删除向量数据失败: {str(e)}")
            raise

    def search(
        self,
        collection_name: str,
        query_vector: List[float],
        limit: int = 5
    ) -> List[Dict]:
        """
        搜索相似向量

        Args:
            collection_name: 集合名称
            query_vector: 查询向量
            limit: 返回结果数量

        Returns:
            List[Dict]: 相似文档列表
        """
        try:
            search_result = self.client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=limit
            )

            return [
                {
                    "id": hit.id,
                    "score": hit.score,
                    "title": hit.payload.get("title", ""),
                    "text": hit.payload.get("text", "")
                }
                for hit in search_result
            ]

        except Exception as e:
            logger.error(f"搜索向量失败: {str(e)}")
            raise