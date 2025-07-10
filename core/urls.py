from django.urls import path, include
from . import views
from .views import login_view
from rest_framework.routers import DefaultRouter
from .api_views import (
    CriticalProductListView,
    ProductoViewSet,
    VentaListCreateView,
    DashboardStatsView,
    CategoriaListView,
    ClienteListView,
    DailySalesSummary,
    EmployeeListCreateView,
    CurrentUserView,
)
from django.shortcuts import redirect
from django.contrib.auth import logout
from django.contrib.auth import views as auth_views


def cerrar_sesion(request):
    logout(request)
    return redirect('login')


router = DefaultRouter()
router.register(r'api/productos', ProductoViewSet, basename="productos")

urlpatterns = [
    path('', lambda request: redirect('login'), name='root_redirect'),
    path('inicio/', views.index, name='index'),
    path('productos/', views.ProductoListView.as_view(), name='producto_list'),
    path("inventario/reporte/", views.ReporteInventarioView.as_view(), name="reporte_inventario"),
    path("inventario/exportar/", views.exportar_inventario_excel, name="exportar_inventario_excel"),
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
    path("movimientos/nuevo/", views.MovimientoManualCreateView.as_view(), name="movimiento_create"),
    path('productos/cargar/', views.CargarProductosView.as_view(), name='cargar_productos'),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('login/', login_view, name='login'),
    path('logout/', cerrar_sesion, name='logout'),
    path('api/critical-products/', CriticalProductListView.as_view(), name='critical_products'),
    path('api/ventas/', VentaListCreateView.as_view(), name='ventas_api'),
    path('api/dashboard/', DashboardStatsView.as_view(), name='dashboard_api'),
    path('api/categorias/', CategoriaListView.as_view(), name='categorias_api'),
    path('api/clientes/', ClienteListView.as_view(), name='clientes_api'),
    path('api/empleados/', EmployeeListCreateView.as_view(), name='employees_api'),
    path('api/sales-summary/', DailySalesSummary.as_view(), name='sales_summary_api'),
    path('api/me/', CurrentUserView.as_view(), name='current_user_api'),
    path('password_reset/',
         auth_views.PasswordResetView.as_view(
             template_name='registration/password_reset_form.html'),
         name='password_reset'),
    path('password_reset/done/',
         auth_views.PasswordResetDoneView.as_view(
             template_name='registration/password_reset_done.html'),
         name='password_reset_done'),
    path('reset/<uidb64>/<token>/',
         auth_views.PasswordResetConfirmView.as_view(
             template_name='registration/password_reset_confirm.html'),
         name='password_reset_confirm'),
    path('reset/done/',
         auth_views.PasswordResetCompleteView.as_view(
             template_name='registration/password_reset_complete.html'),
         name='password_reset_complete'),
    path('', include('django.contrib.auth.urls')),

]


urlpatterns += router.urls


