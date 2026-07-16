from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas

router = APIRouter()

@router.post("/")
def cadastrar_cliente(
    cliente: schemas.ClienteCreate,
    db: Session = Depends(get_db)
):
    return crud.criar_cliente(db, cliente)