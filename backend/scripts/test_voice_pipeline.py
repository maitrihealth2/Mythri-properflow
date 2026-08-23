"""Voice Pipeline Smoke Test — Day 3"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PASS = "PASS ✅"
FAIL = "FAIL ❌"
results = []

def check(label, condition, detail=""):
    status = PASS if condition else FAIL
    results.append((label, condition))
    print(f"  {status}  {label}" + (f" — {detail}" if detail else ""))
    return condition


def run():
    print("=" * 60)
    print("VOICE PIPELINE SMOKE TEST — Day 3")
    print("=" * 60)

    # ── 1. Voice module imports ───────────────────────────────────
    print("\n[1] VOICE MODULE IMPORTS")
    try:
        from modules.voice.api import router as voice_router
        routes = [r.path for r in voice_router.routes if hasattr(r, "path")]
        check("voice.api importable", True, f"routes={routes}")
    except Exception as e:
        check("voice.api importable", False, str(e))

    try:
        from modules.voice.vocal_engine import get_prosody_params, optimize_pitch
        check("vocal_engine importable (get_prosody_params, optimize_pitch)", True)
    except Exception as e:
        check("vocal_engine importable", False, str(e))

    try:
        from modules.voice.stt_batcher import batch_transcribe_audio
        check("stt_batcher importable (batch_transcribe_audio)", True)
    except Exception as e:
        check("stt_batcher importable", False, str(e))

    # ── 2. Sarvam provider capabilities ──────────────────────────
    print("\n[2] SARVAM PROVIDER METHODS")
    try:
        from providers.sarvam.sarvam_client import stream_chat_with_mythri, get_async_client
        check("sarvam_client: stream_chat_with_mythri", True)
        check("sarvam_client: get_async_client", True)
    except Exception as e:
        check("sarvam_client importable", False, str(e))

    try:
        from modules.voice.stt_batcher import batch_transcribe_audio, SARVAM_API_KEY
        has_key = bool(SARVAM_API_KEY)
        check("SARVAM_API_KEY present", has_key, f"key={'set' if has_key else 'MISSING'}")
    except Exception as e:
        check("SARVAM_API_KEY check", False, str(e))

    # ── 3. Voice routes registered in app ────────────────────────
    print("\n[3] VOICE ROUTES IN MAIN APP")
    try:
        from app import app
        all_routes = [r.path for r in app.routes if hasattr(r, "path")]
        voice_routes = [r for r in all_routes if any(k in r.lower() for k in ("voice", "audio", "ws", "stream"))]
        check("Voice routes registered", len(voice_routes) > 0, f"found={voice_routes}")
        ws_routes = [r for r in all_routes if "ws" in r.lower() or "stream" in r.lower()]
        check("WebSocket/streaming route present", len(ws_routes) > 0, f"found={ws_routes}")
    except Exception as e:
        check("Voice routes registered", False, str(e))

    # ── 4. STT batcher health ─────────────────────────────────────
    print("\n[4] STT BATCHER — SUPPORTED LANGUAGES")
    try:
        from modules.voice.stt_batcher import SUPPORTED_LANGUAGES
        check("SUPPORTED_LANGUAGES defined", len(SUPPORTED_LANGUAGES) > 0,
              f"count={len(SUPPORTED_LANGUAGES)} langs={SUPPORTED_LANGUAGES[:3]}")
    except Exception as e:
        check("SUPPORTED_LANGUAGES", False, str(e))

    # Summary
    print("\n" + "=" * 60)
    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    print(f"RESULT: {passed}/{total} checks passed")
    if passed == total:
        print("ALL CHECKS PASSED — Voice pipeline verified ✅")
    else:
        print("SOME CHECKS FAILED — see above ❌")
    print("=" * 60)


if __name__ == "__main__":
    run()
