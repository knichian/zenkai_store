from pydantic import BaseModel


class ClienteBase(BaseModel):
    nome: str
    email: str
    senha: str


class ClienteCreate(ClienteBase):
    pass


class Cliente(ClienteBase):
    id: int

    class Config:
        from_attributes = True
class Login(BaseModel):
    email: str
    senha: str
class PedidoCreate(BaseModel):
    cliente_id: int
    produto_id: int
    quantidade: int


class Pedido(BaseModel):
    id: int
    cliente_id: int
    produto_id: int
    quantidade: int
    valor_total: float

    class Config:
        from_attributes = True

class ProdutoUpdate(BaseModel):
    nome: str
    descricao: str
    preco: float
    estoque: int