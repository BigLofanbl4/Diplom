from fastapi import APIRouter

from ..schemas import GroupCreate

router = APIRouter(prefix='/groups', tags=['groups'])


@router.post('/create', response_model=GroupCreate)
def create_group(group: GroupCreate):
    pass
