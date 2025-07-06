from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow requests from Vite dev servers during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.post('/api/productos/')
async def crear_producto(request: Request):
    if request.headers.get('content-type') != 'application/json':
        raise HTTPException(status_code=400, detail='Content-Type must be application/json')
    data = await request.json()
    # validate required fields
    if 'categoria' not in data:
        return JSONResponse({'success': False, 'error': 'Categoria requerida'}, status_code=400)
    return {'success': True, 'producto': data}

@app.get('/api/productos/')
async def lista_productos():
    return []