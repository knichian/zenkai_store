from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import jwt
import datetime
import sqlite3
import bcrypt
import os
import shutil
import json
import uuid
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static/img", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

api_router = APIRouter(prefix='/zenkai/api')
SECRET_KEY = os.environ.get("SECRET_KEY")
security = HTTPBearer()
DB_PATH = "zenkai_database.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS Categoria (
            ID_Categoria INTEGER PRIMARY KEY AUTOINCREMENT,
            Nome TEXT NOT NULL,
            Descricao TEXT
        );

        CREATE TABLE IF NOT EXISTS Cliente (
            ID_Cliente INTEGER PRIMARY KEY AUTOINCREMENT,
            Nome TEXT NOT NULL,
            Email TEXT UNIQUE NOT NULL,
            Senha TEXT NOT NULL,
            Telefone TEXT,
            Endereco TEXT,
            Data_Cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
            Tipo_Cliente TEXT CHECK(Tipo_Cliente IN ('PF', 'PJ')) NOT NULL DEFAULT 'PF', 
            Role TEXT CHECK(Role IN ('CLIENTE', 'ADMIN')) NOT NULL DEFAULT 'CLIENTE'
        );

        CREATE TABLE IF NOT EXISTS Pessoa_Fisica (
            ID_Cliente INTEGER PRIMARY KEY,
            CPF TEXT UNIQUE NOT NULL,
            Data_Nascimento DATE,
            FOREIGN KEY (ID_Cliente) REFERENCES Cliente(ID_Cliente) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS Pessoa_Juridica (
            ID_Cliente INTEGER PRIMARY KEY,
            CNPJ TEXT UNIQUE NOT NULL,
            Razao_Social TEXT NOT NULL,
            Inscricao_Estadual TEXT,
            FOREIGN KEY (ID_Cliente) REFERENCES Cliente(ID_Cliente) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS Produto (
            ID_Produto INTEGER PRIMARY KEY AUTOINCREMENT,
            ID_Categoria INTEGER,
            Nome TEXT NOT NULL,
            Descricao TEXT,
            Preco_Atual REAL NOT NULL,
            Quantidade_Estoque INTEGER NOT NULL DEFAULT 0,
            tamanhos TEXT NOT NULL DEFAULT '{}',
            imagem TEXT,
            FOREIGN KEY (ID_Categoria) REFERENCES Categoria(ID_Categoria)
        );

        CREATE TABLE IF NOT EXISTS Pedido (
            ID_Pedido INTEGER PRIMARY KEY AUTOINCREMENT,
            ID_Cliente INTEGER NOT NULL,
            Data_Pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
            Status_Pedido TEXT NOT NULL DEFAULT 'Aprovado',
            Valor_Total REAL NOT NULL,
            FOREIGN KEY (ID_Cliente) REFERENCES Cliente(ID_Cliente)
        );

        CREATE TABLE IF NOT EXISTS ItensPedido (
            ID_Pedido INTEGER NOT NULL,
            ID_Produto INTEGER NOT NULL,
            tamanho TEXT NOT NULL,
            Quantidade INTEGER NOT NULL,
            Preco_Unitario REAL NOT NULL,
            PRIMARY KEY (ID_Pedido, ID_Produto, tamanho),
            FOREIGN KEY (ID_Pedido) REFERENCES Pedido(ID_Pedido) ON DELETE CASCADE,
            FOREIGN KEY (ID_Produto) REFERENCES Produto(ID_Produto)
        );

        CREATE TABLE IF NOT EXISTS Pagamento (
            ID_Pagamento INTEGER PRIMARY KEY AUTOINCREMENT,
            ID_Pedido INTEGER NOT NULL,
            Data_Hora DATETIME DEFAULT CURRENT_TIMESTAMP,
            Valor REAL NOT NULL,
            Status TEXT NOT NULL,
            Tipo_Pagamento TEXT CHECK(Tipo_Pagamento IN ('CARTAO', 'PIX', 'DINHEIRO')) NOT NULL,
            FOREIGN KEY (ID_Pedido) REFERENCES Pedido(ID_Pedido)
        );

        CREATE TABLE IF NOT EXISTS Pagamento_Cartao (
            ID_Pagamento INTEGER PRIMARY KEY,
            Numero_Cartao TEXT NOT NULL, 
            Nome_Titular TEXT NOT NULL,
            Parcelas INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (ID_Pagamento) REFERENCES Pagamento(ID_Pagamento) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS Pagamento_Pix (
            ID_Pagamento INTEGER PRIMARY KEY,
            Chave_Pix TEXT NOT NULL,
            Codigo_Transacao TEXT UNIQUE NOT NULL,
            FOREIGN KEY (ID_Pagamento) REFERENCES Pagamento(ID_Pagamento) ON DELETE CASCADE
        );
    """)
    conn.commit()
    conn.close()

init_db()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row 
    return conn

class UsuarioAuth(BaseModel):
    nome: Optional[str] = None
    email: str
    senha: str
    role: str = "CLIENTE"

class ItemCarrinho(BaseModel):
    produto_id: int
    tamanho: str
    quantidade: int
    preco_unitario: float

# NOVAS CLASSES DE PAGAMENTO PDV
class PagamentoInfo(BaseModel):
    metodo: str  # DINHEIRO, CARTAO, PIX
    valor_recebido: float
    parcelas: Optional[int] = 1

class CheckoutPayload(BaseModel):
    total: float
    desconto: float = 0.0
    cliente_id: Optional[int] = None
    itens: List[ItemCarrinho]
    pagamento: Optional[PagamentoInfo] = None

def get_user_from_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        return jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
    except:
        raise HTTPException(status_code=401, detail="Sessão inválida. Refaça o login.")

@api_router.post('/cadastro')
async def cadastrar(user: UsuarioAuth):
    hash_senha = bcrypt.hashpw(user.senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    conn = get_db()
    try:
        conn.execute("INSERT INTO Cliente (Nome, Email, Senha, Role) VALUES (?, ?, ?, ?)",
                     (user.nome, user.email, hash_senha, user.role))
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    finally:
        conn.close()
    return {"message": "Criado com sucesso"}

@api_router.post('/login')
async def login(user: UsuarioAuth):
    conn = get_db()
    user_db = conn.execute("SELECT * FROM Cliente WHERE Email = ?", (user.email,)).fetchone()
    conn.close()

    if not user_db or not bcrypt.checkpw(user.senha.encode('utf-8'), user_db["Senha"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    payload = {
        "id": user_db["ID_Cliente"], "email": user_db["Email"], 
        "nome": user_db["Nome"], "role": user_db["Role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }
    return {"token": jwt.encode(payload, SECRET_KEY, algorithm="HS256"), "role": user_db["Role"], "nome": user_db["Nome"]}

@api_router.get('/produtos')
async def listar_produtos():
    conn = get_db()
    query = """
        SELECT p.ID_Produto as id, p.Nome as nome, p.Descricao as descricao, 
               p.Preco_Atual as preco, p.Quantidade_Estoque as estoque, 
               p.tamanhos, p.imagem, c.Nome as categoria 
        FROM Produto p 
        LEFT JOIN Categoria c ON p.ID_Categoria = c.ID_Categoria
    """
    produtos = conn.execute(query).fetchall()
    conn.close()
    return [dict(p) for p in produtos]

@api_router.get('/produtos/{id}')
async def obter_produto(id: int):
    conn = get_db()
    query = """
        SELECT p.ID_Produto as id, p.Nome as nome, p.Descricao as descricao, 
               p.Preco_Atual as preco, p.Quantidade_Estoque as estoque, 
               p.tamanhos, p.imagem, c.Nome as categoria 
        FROM Produto p 
        LEFT JOIN Categoria c ON p.ID_Categoria = c.ID_Categoria
        WHERE p.ID_Produto = ?
    """
    produto = conn.execute(query, (id,)).fetchone()
    conn.close()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não localizado.")
    return dict(produto)

@api_router.post('/produtos/cadastro')
async def cadastrar_produto(
    nome: str = Form(...), descricao: str = Form(""), preco: float = Form(...),
    estoque: int = Form(...), tamanhos: str = Form(...), categoria: str = Form(...),
    imagem: Optional[UploadFile] = File(None), user=Depends(get_user_from_token)
):
    if user.get("role") != "ADMIN": raise HTTPException(status_code=403)
    
    img_path = None
    if imagem:
        filename = f"prod_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.{imagem.filename.split('.')[-1]}"
        full_path = os.path.join("static/img", filename)
        with open(full_path, "wb") as f: shutil.copyfileobj(imagem.file, f)
        img_path = f"http://localhost:8000/static/img/{filename}"

    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT ID_Categoria FROM Categoria WHERE Nome = ?", (categoria,))
    cat = cursor.fetchone()
    if cat:
        cat_id = cat["ID_Categoria"]
    else:
        cursor.execute("INSERT INTO Categoria (Nome) VALUES (?)", (categoria,))
        cat_id = cursor.lastrowid

    cursor.execute(
        """INSERT INTO Produto (Nome, Descricao, Preco_Atual, Quantidade_Estoque, tamanhos, imagem, ID_Categoria) 
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (nome, descricao, preco, estoque, tamanhos, img_path, cat_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Sucesso"}

@api_router.delete('/produtos/{id}')
async def deletar_produto(id: int, user=Depends(get_user_from_token)):
    if user.get("role") != "ADMIN": raise HTTPException(status_code=403)
    conn = get_db()
    conn.execute("DELETE FROM Produto WHERE ID_Produto = ?", (id,))
    conn.commit()
    conn.close()
    return {"message": "Deletado"}

# NOVA ROTA: BUSCA DE CLIENTES CRM
@api_router.get('/clientes/buscar')
async def buscar_cliente(q: str, user=Depends(get_user_from_token)):
    if user.get("role") != "ADMIN": raise HTTPException(status_code=403)
    conn = get_db()
    query = "SELECT ID_Cliente as id, Nome as nome, Email as email, Telefone as telefone FROM Cliente WHERE Nome LIKE ? OR Email LIKE ? OR Telefone LIKE ? LIMIT 5"
    clientes = conn.execute(query, (f"%{q}%", f"%{q}%", f"%{q}%")).fetchall()
    conn.close()
    return [dict(c) for c in clientes]

@api_router.post('/checkout')
async def finalizar_compra(pedido: CheckoutPayload, user=Depends(get_user_from_token)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        total_com_desconto = max(0, pedido.total - pedido.desconto)
        
        # 1. Resolve o Cliente (Se não enviado, busca/cria Consumidor Final)
        cliente_id = pedido.cliente_id
        if not cliente_id:
            cursor.execute("SELECT ID_Cliente FROM Cliente WHERE Email = 'consumidor@final.com'")
            cf = cursor.fetchone()
            if cf:
                cliente_id = cf["ID_Cliente"]
            else:
                cursor.execute("INSERT INTO Cliente (Nome, Email, Senha, Role) VALUES ('Consumidor Final', 'consumidor@final.com', '123456', 'CLIENTE')")
                cliente_id = cursor.lastrowid

        # 2. Cria o Pedido
        cursor.execute("INSERT INTO Pedido (ID_Cliente, Valor_Total, Status_Pedido) VALUES (?, ?, 'Aprovado')", 
                       (cliente_id, total_com_desconto))
        pedido_id = cursor.lastrowid
        
        # 3. Processa Estoque e Itens
        for item in pedido.itens:
            cursor.execute("SELECT tamanhos FROM Produto WHERE ID_Produto = ?", (item.produto_id,))
            prod = cursor.fetchone()
            grade_tamanhos = json.loads(prod["tamanhos"])
            
            if grade_tamanhos.get(item.tamanho, 0) < item.quantidade:
                raise Exception(f"Estoque insuficiente para o tamanho {item.tamanho}.")
            
            grade_tamanhos[item.tamanho] -= item.quantidade
            
            cursor.execute("INSERT INTO ItensPedido (ID_Pedido, ID_Produto, tamanho, Quantidade, Preco_Unitario) VALUES (?, ?, ?, ?, ?)",
                           (pedido_id, item.produto_id, item.tamanho, item.quantidade, item.preco_unitario))
            
            cursor.execute("UPDATE Produto SET Quantidade_Estoque = Quantidade_Estoque - ?, tamanhos = ? WHERE ID_Produto = ?", 
                           (item.quantidade, json.dumps(grade_tamanhos), item.produto_id))
        
        # 4. Processa Pagamento
        if pedido.pagamento:
            metodo = pedido.pagamento.metodo
            cursor.execute("INSERT INTO Pagamento (ID_Pedido, Valor, Status, Tipo_Pagamento) VALUES (?, ?, 'Aprovado', ?)",
                           (pedido_id, total_com_desconto, metodo))
            pagamento_id = cursor.lastrowid

            if metodo == 'CARTAO':
                cursor.execute("INSERT INTO Pagamento_Cartao (ID_Pagamento, Numero_Cartao, Nome_Titular, Parcelas) VALUES (?, '0000', 'PDV Físico', ?)", 
                               (pagamento_id, pedido.pagamento.parcelas))
            elif metodo == 'PIX':
                cursor.execute("INSERT INTO Pagamento_Pix (ID_Pagamento, Chave_Pix, Codigo_Transacao) VALUES (?, 'loja@pix.com', ?)",
                               (pagamento_id, str(uuid.uuid4())))
                
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()
    return {"message": "Compra finalizada com sucesso!"}

app.include_router(api_router)
