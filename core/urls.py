from django.urls import path
from . import views
from django.contrib.auth.views import LoginView, LogoutView
from django.shortcuts import redirect
from django.contrib.auth import logout


def cerrar_sesion(request):
    logout(request)
    return redirect('login')

urlpatterns = [
    path('', lambda request: redirect('login'), name='root_redirect'),
    path('inicio/', views.index, name='index'),
    path('productos/', views.ProductoListView.as_view(), name='producto_list'),
    path('productos/nuevo/', views.ProductoCreateView.as_view(), name='producto_create'),
    path('productos/<int:pk>/editar/', views.ProductoUpdateView.as_view(), name='producto_update'),
    path('productos/<int:pk>/eliminar/', views.ProductoDeleteView.as_view(), name='producto_delete'),
    path('ventas/nueva/', views.VentaCreateView.as_view(), name='venta_create'),
    path('ventas/', views.VentaListView.as_view(), name='venta_list'),
    path('compras/nueva/', views.CompraCreateView.as_view(), name='compra_create'),
    path('compras/', views.CompraListView.as_view(), name='compra_list'),
    path('balance/', views.BalanceView.as_view(), name='balance'),
    path('balance/exportar/', views.exportar_balance_excel, name='exportar_balance_excel'),
    path('balance/pdf/', views.exportar_balance_pdf, name='exportar_balance_pdf'),
    path('movimientos/', views.MovimientoInventarioListView.as_view(), name='movimiento_list'),
    path('productos/cargar/', views.CargarProductosView.as_view(), name='cargar_productos'),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('login/', LoginView.as_view(template_name='core/login.html'), name='login'),
    path('logout/', cerrar_sesion, name='logout'),

]



