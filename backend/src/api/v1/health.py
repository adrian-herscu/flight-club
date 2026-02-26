from fastapi import APIRouter

router = APIRouter()


@router.get("/health", status_code=200)
async def health_check() -> dict[str, str]:
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns:
        Simple status message without request_id (exception per spec).
    """
    return {"status": "healthy"}
