from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas

router = APIRouter()

@router.post("/")
def login(dados: schemas.Login, db: Session = Depends(get_db)):
    cliente = crud.autenticar_cliente(
        db,
        dados.email,
        dados.senha
    )

    if not cliente:
        raise HTTPException(
            status_code=401,
            detail="Email ou senha inválidos"
        )

    return {
        "mensagem": "Login realizado com sucesso!",
        "cliente": {
            "id": cliente.id,
            "nome": cliente.nome,
            "email": cliente.email
        }
    }