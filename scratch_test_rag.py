import sys
import os
import asyncio

sys.path.append(os.path.abspath("backend"))

from dotenv import load_dotenv
load_dotenv(os.path.join("backend", ".env"))
load_dotenv(os.path.join("backend", ".env.local"), override=True)

from rag.knowledge.retriever import retrieve_context, get_collection, is_knowledge_base_ready

print("RAG Ready?", is_knowledge_base_ready())
collection = get_collection()
print("Collection:", collection)

if collection:
    context = retrieve_context("anxiety")
    print("Context length:", len(context))
    print("Context start:", context[:100])
else:
    print("Collection is None. Cannot retrieve.")
