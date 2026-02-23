from pydantic import BaseModel

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    organization_id: int


class TokenOut(BaseModel):
    access_token: str
    token_type: str