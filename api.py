from fastapi import FastAPI
from django.forms.models import model_to_dict
from core.models import Producto, MovimientoInventario

app = FastAPI()

@app.get("/productos/")
def lista_productos():
    productos = Producto.objects.all()
    return [model_to_dict(p) for p in productos]

@app.get("/movimientos/")
def lista_movimientos():
    movimientos = MovimientoInventario.objects.all()
    return [model_to_dict(m) for m in movimientos]