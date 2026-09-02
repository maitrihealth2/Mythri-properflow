import uvicorn
import os

if __name__ == "__main__":
    print("=============================================")
    print(" Affyne Labs — Mythri Enterprise Backend Bootstrapping")
    print("=============================================")
    
    # Load from src/main:app instead of root app:app
    uvicorn.run(
        "src.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )

