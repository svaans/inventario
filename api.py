from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

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


@app.get('/api/critical-products/')
async def critical_products():
    """Return products with low stock for demo purposes."""
    demo_product = {
        "id": 1,
        "nombre": "Producto Critico",
        "stock_actual": 3,
        "stock_minimo": 5,
    }
    return {"results": [demo_product]}


@app.get('/api/dashboard/')
async def dashboard():
    """Return minimal dashboard data so the UI can render."""
    today = datetime.utcnow().date().isoformat()
    week_sales = [
        {"day": "Mon", "total": 10},
        {"day": "Tue", "total": 15},
        {"day": "Wed", "total": 7},
        {"day": "Thu", "total": 12},
        {"day": "Fri", "total": 4},
        {"day": "Sat", "total": 6},
        {"day": "Sun", "total": 5},
    ]
    return {
        "sales_today": 20,
        "sales_week": sum(d["total"] for d in week_sales),
        "total_products": 1,
        "low_stock": 1,
        "out_stock": 0,
        "inventory_value": 100.0,
        "production_today": 0,
        "top_products": [{"producto__nombre": "Producto Critico", "total_vendido": 50}],
        "week_sales": week_sales,
        "alerts": [{"nombre": "Producto Critico", "stock_actual": 3, "stock_minimo": 5}],
        "last_updated": datetime.utcnow().isoformat(),
    
    }