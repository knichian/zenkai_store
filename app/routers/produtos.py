from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app import crud, schemas

router = APIRouter()


@router.get("/")
def listar_produtos(db: Session = Depends(get_db)):
    return crud.get_produtos(db)


@router.get("/{produto_id}")
def buscar_produto(
    produto_id: int,
    db: Session = Depends(get_db)
):

    produto = crud.get_produto_por_id(db, produto_id)

    if not produto:
        raise HTTPException(
            status_code=404,
            detail="Produto não encontrado"
        )

    return produto


@router.put("/{produto_id}")
def editar_produto(
    produto_id: int,
    dados: schemas.ProdutoUpdate,
    db: Session = Depends(get_db)
):

    produto = crud.atualizar_produto(
        db,
        produto_id,
        dados
    )

    if not produto:
        raise HTTPException(
            status_code=404,
            detail="Produto não encontrado"
        )

    return produto


@router.delete("/{produto_id}")
def excluir_produto(
    produto_id: int,
    db: Session = Depends(get_db)
):

    produto = crud.deletar_produto(db, produto_id)

    if not produto:
        raise HTTPException(
            status_code=404,
            detail="Produto não encontrado"
        )

    return {
        "mensagem": "Produto removido com sucesso"
    }