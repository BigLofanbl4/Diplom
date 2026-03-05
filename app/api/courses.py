from fastapi import APIRouter

router = APIRouter(prefix='/courses', tags=['courses'])


@router.get('/')
def index():
    pass
