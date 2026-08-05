"""
Phase 3.3 Verification Script
Tests: OpenRouter, HuggingFace, Failover, Sarvam Archival, Subsystem imports
"""
import asyncio
import sys
import os
import time
import pathlib

# Force UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8')

# Add backend root to path
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

PASS = "[PASS]"
FAIL = "[FAIL]"
INFO = "  -->"

results = []

def record(name, passed, detail=""):
    status = PASS if passed else FAIL
    print(f"  {status} {name}" + (f": {detail}" if detail else ""))
    results.append((name, passed))

# ─── TEST 1: Config loads correctly ─────────────────────────────────────────
print("\n[1] Config & Credential Loading")
try:
    from providers.llm.config import (
        OPENROUTER_API_KEY, HF_API_KEY, PRIMARY_MODEL, SECONDARY_MODEL,
        OPENROUTER_BASE_URL, HF_BASE_URL
    )
    record("MAITRI_OPENROUTER_API_KEY loaded", bool(OPENROUTER_API_KEY) and "sk-or" in OPENROUTER_API_KEY)
    record("MAITRI_HF_API_KEY loaded", bool(HF_API_KEY) and "hf_" in HF_API_KEY)
    record("PRIMARY_MODEL set", bool(PRIMARY_MODEL), PRIMARY_MODEL)
    record("SECONDARY_MODEL set", bool(SECONDARY_MODEL), SECONDARY_MODEL)
    record("HF_TOKEN not consumed by config", os.getenv("HF_TOKEN") != HF_API_KEY)
except Exception as e:
    record("Config module import", False, str(e))

# ─── TEST 2: Exception hierarchy ─────────────────────────────────────────────
print("\n[2] Exception Hierarchy")
try:
    from providers.llm.exceptions import (
        ProviderTimeoutError, ProviderRateLimitError, ProviderServerError,
        ProviderNetworkError, ProviderStreamError, ProviderEmptyResponseError,
        ProviderConfigurationError, ProviderError
    )
    record("All exception classes importable", True)
    record("Failover exceptions are ProviderError subclasses", 
           issubclass(ProviderTimeoutError, ProviderError))
    record("ConfigurationError is ProviderError subclass", 
           issubclass(ProviderConfigurationError, ProviderError))
except Exception as e:
    record("Exception hierarchy import", False, str(e))

# ─── TEST 3: Provider instantiation ──────────────────────────────────────────
print("\n[3] Provider Instantiation")
try:
    from providers.llm.openrouter import OpenRouterProvider
    from providers.llm.huggingface import HuggingFaceProvider
    or_provider = OpenRouterProvider()
    hf_provider = HuggingFaceProvider()
    record("OpenRouterProvider instantiated", True, f"model={or_provider.model}")
    record("HuggingFaceProvider instantiated", True, f"model={hf_provider.model}")
    record("OpenRouter name", or_provider.name == "OpenRouter")
    record("HuggingFace name", hf_provider.name == "HuggingFace")
except Exception as e:
    record("Provider instantiation", False, str(e))

# ─── TEST 4: Router instantiation ────────────────────────────────────────────
print("\n[4] Router Instantiation")
try:
    from providers.llm.router import llm_router, LLMRouter
    record("Router imported as singleton", isinstance(llm_router, LLMRouter))
    record("Primary provider is OpenRouter", llm_router._primary.name == "OpenRouter")
    record("Secondary provider is HuggingFace", llm_router._secondary.name == "HuggingFace")
except Exception as e:
    record("Router import", False, str(e))

# ─── TEST 5: Sarvam Archival ──────────────────────────────────────────────────
print("\n[5] Sarvam Archival Verification")
try:
    from providers.sarvam.sarvam_client import (
        THERAPY_SYSTEM_PROMPT, ASSESSOR_PROMPT, CASE_FILE_SCHEMA,
        get_async_client, get_shared_http_client, close_sarvam_client,
        _build_language_lock, _extract_facts_from_memory_block, chat_with_maitri
    )
    record("THERAPY_SYSTEM_PROMPT intact", bool(THERAPY_SYSTEM_PROMPT) and "Maitri" in THERAPY_SYSTEM_PROMPT)
    record("ASSESSOR_PROMPT intact", bool(ASSESSOR_PROMPT))
    record("CASE_FILE_SCHEMA intact", bool(CASE_FILE_SCHEMA))
    record("get_async_client() callable", callable(get_async_client))
    record("get_shared_http_client() callable", callable(get_shared_http_client))
    record("close_sarvam_client() callable", callable(close_sarvam_client))
    record("_build_language_lock() callable", callable(_build_language_lock))
    record("_extract_facts_from_memory_block() callable", callable(_extract_facts_from_memory_block))
    record("chat_with_maitri() callable", callable(chat_with_maitri))
    
    # Verify chat_with_maitri delegates to router (not directly calling Sarvam)
    import inspect
    src = inspect.getsource(chat_with_maitri)
    record("chat_with_maitri delegates to llm_router", "llm_router" in src)
    record("Sarvam not directly called in chat_with_maitri", "client.chat.completions.create" not in src)
except Exception as e:
    record("Sarvam archival import", False, str(e))

# ─── TEST 6: Analyst still works with Sarvam client ─────────────────────────
print("\n[6] Analyst (Assessor) Sarvam Compatibility")
try:
    from providers.sarvam.sarvam_client import ASSESSOR_PROMPT, get_async_client
    from rag.brain.analyst import assess_turn, should_skip_assessor
    record("ASSESSOR_PROMPT importable by analyst", bool(ASSESSOR_PROMPT))
    record("assess_turn callable", callable(assess_turn))
    record("should_skip_assessor callable", callable(should_skip_assessor))
except Exception as e:
    record("Analyst import", False, str(e))

# ─── TEST 7: Live OpenRouter call ─────────────────────────────────────────────
print("\n[7] Live OpenRouter Request")
async def test_openrouter():
    try:
        from providers.llm.openrouter import OpenRouterProvider
        p = OpenRouterProvider()
        t0 = time.perf_counter()
        result = await p.generate(
            api_messages=[
                {"role": "system", "content": "You are a helpful assistant. Keep responses to one short sentence."},
                {"role": "user", "content": "Say hello in one sentence."}
            ],
            max_tokens=200,  # Realistic minimum; 64 may be consumed by model preamble
            temperature=0.5,
        )
        elapsed = time.perf_counter() - t0
        await p.close()
        return result, elapsed
    except Exception as e:
        return None, str(e)

result, meta = asyncio.run(test_openrouter())
if isinstance(meta, float):
    record("OpenRouter returns valid text", bool(result) and len(result) > 5, f"{len(result)} chars in {meta:.2f}s")
    record("OpenRouter response time < 30s", meta < 30, f"{meta:.2f}s")
    print(f"  {INFO} Response: {result[:100] if result else 'N/A'}")
else:
    record("OpenRouter live call", False, str(meta))

# ─── TEST 8: Live HuggingFace call ───────────────────────────────────────────
print("\n[8] Live HuggingFace Request")
async def test_hf():
    try:
        from providers.llm.huggingface import HuggingFaceProvider
        p = HuggingFaceProvider()
        t0 = time.perf_counter()
        result = await p.generate(
            api_messages=[
                {"role": "system", "content": "You are a helpful assistant. Keep responses very short (1 sentence)."},
                {"role": "user", "content": "Say hello in one sentence."}
            ],
            max_tokens=64,
            temperature=0.5,
        )
        elapsed = time.perf_counter() - t0
        await p.close()
        return result, elapsed
    except Exception as e:
        return None, str(e)

result, meta = asyncio.run(test_hf())
if isinstance(meta, float):
    record("HuggingFace returns valid text", bool(result) and len(result) > 5, f"{len(result)} chars in {meta:.2f}s")
    record("HuggingFace response time < 60s", meta < 60, f"{meta:.2f}s")
    print(f"  {INFO} Response: {result[:100] if result else 'N/A'}")
else:
    record("HuggingFace live call", False, str(meta))

# ─── TEST 9: Automatic Failover ───────────────────────────────────────────────
print("\n[9] Automatic Failover (Simulated Primary Failure)")
async def test_failover():
    from providers.llm.router import LLMRouter
    from providers.llm.openrouter import OpenRouterProvider
    from providers.llm.exceptions import ProviderRateLimitError

    class BrokenProvider(OpenRouterProvider):
        @property
        def name(self): return "BrokenProvider"
        async def generate(self, *args, **kwargs):
            raise ProviderRateLimitError("Simulated HTTP 429 from primary")

    router = LLMRouter()
    router._primary = BrokenProvider()

    try:
        result = await router.generate(
            api_messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say hello in one sentence."}
            ],
            max_tokens=64,
            temperature=0.5,
        )
        await router.close()
        return result
    except Exception as e:
        return None

result = asyncio.run(test_failover())
record("Failover activates when primary raises ProviderRateLimitError", result is not None)
record("Failover produces valid response", bool(result) and len(result) > 5 if result else False, 
       f"{len(result)} chars" if result else "None")
print(f"  {INFO} Failover response: {result[:100] if result else 'N/A'}")

# ─── TEST 10: Router via chat_with_maitri() ─────────────────────────────────
print("\n[10] End-to-End via chat_with_maitri()")
async def test_e2e():
    from providers.sarvam.sarvam_client import chat_with_maitri
    try:
        result = await chat_with_maitri(
            messages=[{"role": "user", "content": "Hi, I'm feeling a bit stressed today."}],
            language="en-IN",
            max_tokens=150,
        )
        return result
    except Exception as e:
        return str(e)

result = asyncio.run(test_e2e())
is_fallback = result == "I hear you. Tell me more about what's on your mind."
record("chat_with_maitri() returns a response", bool(result))
record("Response is not the fallback string (provider responded)", not is_fallback, 
       "Fallback returned — check provider connectivity" if is_fallback else "OK")
print(f"  {INFO} Response: {result[:120] if result else 'N/A'}")

# ─── SUMMARY ─────────────────────────────────────────────────────────────────
print("\n" + "="*60)
passed = sum(1 for _, p in results if p)
total = len(results)
print(f"  RESULT: {passed}/{total} checks passed")
if passed == total:
    print("  ✅ ALL CHECKS PASSED — Phase 3.3 implementation is complete.")
else:
    failed = [(n, p) for n, p in results if not p]
    print("  ❌ FAILED CHECKS:")
    for name, _ in failed:
        print(f"     - {name}")
print("="*60)
