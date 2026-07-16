from fastapi import FastAPI, APIRouter, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine, SessionLocal
from app import models, crud
from app.routers import produtos, clientes, login, pedidos

Base.metadata.create_all(bind=engine)

db = SessionLocal()

if len(crud.get_produtos(db)) == 0:

    chuteira = crud.criar_categoria(db, "Chuteira")
    corrida = crud.criar_categoria(db, "Corrida")
    basquete = crud.criar_categoria(db, "Basquete")

    crud.criar_produto(
        db,
        "Nike Mercurial Vapor",
        "Chuteira profissional Nike.",
        chuteira,
        999.90,
        8
    )

    crud.criar_produto(
        db,
        "Adidas Predator Elite",
        "Chuteira Adidas para campo.",
        chuteira,
        1199.90,
        5
    )

    crud.criar_produto(
        db,
        "Nike Air Zoom Pegasus",
        "Tênis de corrida Nike.",
        corrida,
        799.90,
        12
    )

    crud.criar_produto(
        db,
        "Nike Revolution 7",
        "Tênis confortável para corrida.",
        corrida,
        449.90,
        15
    )

    crud.criar_produto(
        db,
        "Nike LeBron XXI",
        "Tênis de basquete.",
        basquete,
        1399.90,
        4
    )

db.close()

app = FastAPI()

# ===========================
# CORS
# ===========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===========================
# Arquivos estáticos
# ===========================

app.mount("/static", StaticFiles(directory="static"), name="static")

PROJECT_PREFIX_NAME = "zenkai"
API_PREFIX_NAME = "api"

router = APIRouter(prefix=f"/{PROJECT_PREFIX_NAME}")
api_router = APIRouter(prefix=f"/{API_PREFIX_NAME}")


@api_router.get("/")
async def test_response(request: Request):
    return {
        "message": "API Online!"
    }


api_router.include_router(
    produtos.router,
    prefix="/produtos",
    tags=["Produtos"]
)

api_router.include_router(
    clientes.router,
    prefix="/clientes",
    tags=["Clientes"]
)

api_router.include_router(
    login.router,
    prefix="/login",
    tags=["Login"]
)

api_router.include_router(
    pedidos.router,
    prefix="/pedidos",
    tags=["Pedidos"]
)

router.include_router(api_router)
app.include_router(router)