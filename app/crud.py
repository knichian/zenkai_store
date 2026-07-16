from sqlalchemy.orm import Session
from app import models


# ==========================
# PRODUTOS
# ==========================

def get_produtos(db: Session):
    return db.query(models.Produto).all()


def get_produto_por_id(db: Session, produto_id: int):
    return (
        db.query(models.Produto)
        .filter(models.Produto.id == produto_id)
        .first()
    )


def criar_categoria(db: Session, nome, descricao=""):

    categoria = (
        db.query(models.Categoria)
        .filter(models.Categoria.nome == nome)
        .first()
    )

    if categoria:
        return categoria

    categoria = models.Categoria(
        nome=nome,
        descricao=descricao
    )

    db.add(categoria)
    db.commit()
    db.refresh(categoria)

    return categoria


def criar_produto(
    db: Session,
    nome,
    descricao,
    categoria,
    preco,
    estoque
):

    produto = models.Produto(
        nome=nome,
        descricao=descricao,
        categoria=categoria,
        preco=preco,
        estoque=estoque
    )

    db.add(produto)
    db.commit()
    db.refresh(produto)

    return produto


def atualizar_produto(
    db: Session,
    produto_id: int,
    dados
):

    produto = get_produto_por_id(db, produto_id)

    if not produto:
        return None

    produto.nome = dados.nome
    produto.descricao = dados.descricao
    produto.preco = dados.preco
    produto.estoque = dados.estoque

    db.commit()
    db.refresh(produto)

    return produto


def deletar_produto(db: Session, produto_id: int):

    produto = get_produto_por_id(db, produto_id)

    if not produto:
        return None

    db.delete(produto)
    db.commit()

    return produto


# ==========================
# CLIENTES
# ==========================

def criar_cliente(db: Session, cliente):

    novo_cliente = models.Cliente(
        nome=cliente.nome,
        email=cliente.email,
        senha=cliente.senha
    )

    db.add(novo_cliente)
    db.commit()
    db.refresh(novo_cliente)

    return novo_cliente


def autenticar_cliente(
    db: Session,
    email: str,
    senha: str
):

    return (
        db.query(models.Cliente)
        .filter(
            models.Cliente.email == email,
            models.Cliente.senha == senha
        )
        .first()
    )


# ==========================
# PEDIDOS
# ==========================

def criar_pedido(db: Session, pedido):

    produto = (
        db.query(models.Produto)
        .filter(models.Produto.id == pedido.produto_id)
        .first()
    )

    if not produto:
        return None

    if produto.estoque < pedido.quantidade:
        return "sem_estoque"

    produto.estoque -= pedido.quantidade

    novo_pedido = models.Pedido(
        cliente_id=pedido.cliente_id,
        produto_id=pedido.produto_id,
        quantidade=pedido.quantidade,
        valor_total=produto.preco * pedido.quantidade
    )

    db.add(novo_pedido)
    db.commit()
    db.refresh(novo_pedido)

    return novo_pedido


def get_pedidos(db: Session):
    return db.query(models.Pedido).all()