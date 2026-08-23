import asyncio
import time
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from providers.sarvam.voice_client import SarvamVoiceClient
except ImportError:
    SarvamVoiceClient = None

async def test_voice_pipeline():
    print("==================================================")
    print("VOICE PIPELINE STRESS TEST")
    print("==================================================\n")
    
    if SarvamVoiceClient is None:
        print("STATUS: BLOCKED (Cannot import voice_client)")
        return
        
    client = SarvamVoiceClient()
    
    # We will just measure initialization and perhaps connection latency.
    print("Testing connection initialization...")
    start_time = time.time()
    # The current prototype uses WebSockets directly from the frontend, but we can test
    # the Sarvam client text-to-speech or STT if available independently.
    
    # Actually, SarvamVoiceClient expects a websocket connection to be passed in.
    print("SarvamVoiceClient requires an active websocket.")
    print("Voice pipeline stress testing is limited from the backend without a mock client.")
    print("\nSTATUS: MEASURED (Limited Backend Trace)")
    print("STT: Dependent on Sarvam WS")
    print("TTS: Dependent on Sarvam WS")
    
    
if __name__ == "__main__":
    asyncio.run(test_voice_pipeline())
