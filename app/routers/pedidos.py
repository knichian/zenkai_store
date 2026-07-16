from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas

router = APIRouter()


@router.get("/")
def listar_pedidos(db: Session = Depends(get_db)):
    return crud.get_pedidos(db)


@router.post("/")
def criar_pedido(
    pedido: schemas.PedidoCreate,
    db: Session = Depends(get_db)
):
    resultado = crud.criar_pedido(db, pedido)

    if resultado is None:
        raise HTTPException(
            status_code=404,
            detail="Produto não encontrado."
        )

    if resultado == "sem_estoque":
        raise HTTPException(
            status_code=400,
            detail="Estoque insuficiente."
        )

    return resultado
