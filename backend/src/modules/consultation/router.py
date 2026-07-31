from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database.connection import get_db
from src.database.models import User
from src.security.guards import EnterpriseGuard
from src.modules.consultation.schemas import StartSessionResponse, ChatRequest, ChatResponse
from src.modules.consultation.repository import ConsultationRepository
from src.modules.consultation.services import ConsultationService

router = APIRouter(prefix="/api/consultation", tags=["consultation"])

def get_consultation_service(db: Session = Depends(get_db)) -> ConsultationService:
    repo = ConsultationRepository(db)
    return ConsultationService(repo)

@router.post("/start", response_model=StartSessionResponse, dependencies=EnterpriseGuard())
async def start_session(
    current_user: User = Depends(EnterpriseGuard()[-1]), # Extracts user from the guard pipeline
    service: ConsultationService = Depends(get_consultation_service)
):
    """
    Initializes a new therapy session.
    """
    return await service.start_session(current_user)

@router.post("/message", response_model=ChatResponse, dependencies=EnterpriseGuard())
async def send_message(
    req: ChatRequest,
    current_user: User = Depends(EnterpriseGuard()[-1]),
    service: ConsultationService = Depends(get_consultation_service)
):
    """
    Processes an incoming message through the RAG, emotion detection, and AI pipeline.
    """
    return await service.process_chat(req, current_user)
