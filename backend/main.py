from fastapi import FastAPI, APIRouter, Request
from fastapi.staticfiles import StaticFiles

# objeto principal da aplicação
app = FastAPI() 

# configurações para servidor estatico
static_server = StaticFiles(directory='static')
app.mount('/{PROJECT_PREFIX}/static', static_server, 'static')

# rota principal do projeto
PROJECT_PREFIX_NAME = 'zenkai'
router = APIRouter(prefix=f'/{PROJECT_PREFIX_NAME}')

# rota para chamadas API
API_PREFIX_NAME = 'api'
api_router = APIRouter(prefix=f'/{API_PREFIX_NAME}')

# rotas da aplicação
@api_router.get('/')
async def test_response(request: Request):
    header =  request.headers
    body = await request.body()
    res =  {
        "message": "API Online!",
        "headers": header,
        "body": body
    }
    return res

# integrando rotas a aplicação
router.include_router(api_router)
app.include_router(router)

