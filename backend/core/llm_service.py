# -*- coding: utf-8 -*-
# ---
# @File: llm_service.py
# @Time: 4月 02, 2025
# @Author: Zhang Xinxing
# —
import re
import aiohttp
from core.config import settings
from fastapi import HTTPException
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR

class ChatVllm():
    def __init__(self, model='qwen-32B', port=7888, host="36.103.234.9", adapter=None):
        # 加载动作插入 lora 模型
        self.tokenizer = None
        self.model = model
        self.adapter = adapter
        self.url = f"http://{host}:{port}/v1/chat/completions"
        self.headers = {"Content-Type": "application/json"}

    async def generate_stream(self, input, history, model=None, temperature=0.01, top_p=0.1, system="You are a helpful assistant."):
        """
        异步生成流式响应

        Args:
            input: 用户输入
            history: 对话历史
            model: 模型名称
            temperature: 温度参数
            top_p: top-p参数
            system: 系统提示词

        Returns:
            异步生成器，产生响应片段
        """
        conversation = []

        if system:
            conversation.append({'role': 'system', 'content': system})

        for query_h, response_h in history:
            conversation.append({'role': 'user', 'content': query_h})
            conversation.append({'role': 'assistant', 'content': response_h})
        conversation.append({'role': 'user', 'content': input})

        data = {
            "model": model if model else self.model,
            "stream": True,
            "top_p": top_p,
            "temperature": temperature,
            "messages": conversation
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.url, headers=self.headers, json=data) as resp:
                    async for chunk in resp.content:
                        answer = re.findall(re.compile(r'(?<="content":").*(?="},)'), chunk.decode("utf-8"))
                        answer = answer[0] if len(answer) > 0 else ""
                        yield answer  # 获取响应内容
        except Exception as e:
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error occurred while generating llm response: {e}")

    async def generate(self, input, history, model=None, temperature=0.01, top_p=0.1, system="You are a helpful assistant."):
        conversation = []

        if system:
            conversation.append({'role': 'system', 'content': system})

        for query_h, response_h in history:
            conversation.append({'role': 'user', 'content': query_h})
            conversation.append({'role': 'assistant', 'content': response_h})
        conversation.append({'role': 'user', 'content': input})

        data = {
            "model": model if model else self.model,
            "stream": False,
            "top_p": top_p,
            "temperature": temperature,
            "messages": conversation
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.url, headers=self.headers, json=data) as resp:
                    response = await resp.json()
                    response = response.get("choices")[0]["message"]
                    answer = response.get("content")
                    answer_reasoning = response["reasoning_content"] if response.get("reasoning_content") else ""
                    history.append((input, answer))
                    return {"answer": answer, "reasoning": answer_reasoning, "history": history}
        except Exception as e:
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error occurred while generating llm response: {e}")

# 创建全局LLM实例
chat_llm = ChatVllm(model=settings.LLM_NAME, port=settings.LLM_PORT, host=settings.LLM_HOST, adapter=settings.LLM_ADAPTER)


