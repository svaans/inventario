from django.views import View
from django.views.generic import ListView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
from .forms import ProductoForm
from django.shortcuts import redirect, render
from django.forms import inlineformset_factory
from .models import Venta, DetallesVenta, Producto
from .forms import VentaForm, DetallesVentaForm
from .forms import CompraForm, DetalleCompraForm
from .models import Compra, DetalleCompra, Producto, MovimientoInventario, Categoria
from .forms import BalanceForm
from .models import Venta, Compra, Balance
from django.views.generic import FormView
from django.db.models import F
from django.http import HttpResponse
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from django.contrib import messages
from django.core.files.storage import default_storage
from openpyxl import load_workbook
from django.views.generic import TemplateView
from django.utils.timezone import now
from django.db.models import Sum
from datetime import datetime
from collections import defaultdict
from django.contrib.auth.views import LoginView, LogoutView
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator



def index(request):
    productos_bajo_stock = Producto.objects.filter(stock_actual__lt=F('stock_minimo')).count()
    return render(request, 'core/index.html', {'alerta_stock': productos_bajo_stock})

login_decorador = method_decorator(login_required, name='dispatch')



class ProductoListView(ListView):
    model = Producto
    template_name = 'core/product_list.html'
    context_object_name = 'productos'

@login_decorador
class ProductoCreateView(CreateView):
    model = Producto
    form_class = ProductoForm
    template_name = 'core/producto_form.html'
    success_url = reverse_lazy('producto_list')

@login_decorador
class ProductoUpdateView(UpdateView):
    model = Producto
    form_class = ProductoForm
    template_name = 'core/producto_form.html'
    success_url = reverse_lazy('producto_list')

@login_decorador
class ProductoDeleteView(DeleteView):
    model = Producto
    template_name = 'core/producto_confirm_delete.html'
    success_url = reverse_lazy('producto_list')

class VentaCreateView(CreateView):
    model = Venta
    form_class = VentaForm
    template_name = 'core/venta_form.html'
    success_url = reverse_lazy('venta_list')

    def get(self, request, *args, **kwargs):
        self.object = None
        form = self.get_form()
        DetalleFormSet = inlineformset_factory(Venta, DetallesVenta, form=DetallesVentaForm, extra=1, can_delete=True)
        formset = DetalleFormSet()
        return render(request, self.template_name, {'form': form, 'formset': formset})

    def post(self, request, *args, **kwargs):
        self.object = None
        form = self.get_form()
        DetalleFormSet = inlineformset_factory(Venta, DetallesVenta, form=DetallesVentaForm, extra=1, can_delete=True)
        formset = DetalleFormSet(request.POST)

        if form.is_valid() and formset.is_valid():
            self.object = form.save(commit=False)
            formset.instance = self.object

            total = 0
            for detalle in formset:
                producto = detalle.cleaned_data['producto']
                cantidad = detalle.cleaned_data['cantidad']
                precio = detalle.cleaned_data['precio_unitario']
                total += cantidad * precio

            self.object.total = total
            self.object.save()
            formset.save()

            for detalle in formset:
                producto = detalle.cleaned_data['producto']
                cantidad = detalle.cleaned_data['cantidad']
                producto.stock_actual -= cantidad
                producto.save()

                MovimientoInventario.objects.create(
                    producto=producto,
                    tipo='salida',
                    cantidad=cantidad,
                    motivo='Venta'
                )

            return redirect(self.success_url)

        return render(request, self.template_name, {'form': form, 'formset': formset})

@login_decorador
class VentaListView(ListView):
    model = Venta
    template_name = 'core/venta_list.html'
    context_object_name = 'ventas'
    ordering = ['-fecha']

class CompraCreateView(CreateView):
    model = Compra
    form_class = CompraForm
    template_name = 'core/compra_form.html'
    success_url = reverse_lazy('compra_list')

    def get(self, request, *args, **kwargs):
        self.object = None
        form = self.get_form()
        DetalleFormSet = inlineformset_factory(Compra, DetalleCompra, form=DetalleCompraForm, extra=1, can_delete=True)
        formset = DetalleFormSet()
        return render(request, self.template_name, {'form': form, 'formset': formset})

    def post(self, request, *args, **kwargs):
        self.object = None
        form = self.get_form()
        DetalleFormSet = inlineformset_factory(Compra, DetalleCompra, form=DetalleCompraForm, extra=1, can_delete=True)
        formset = DetalleFormSet(request.POST)

        if form.is_valid() and formset.is_valid():
            self.object = form.save(commit=False)
            formset.instance = self.object

            total = 0
            for detalle in formset:
                producto = detalle.cleaned_data['producto']
                cantidad = detalle.cleaned_data['cantidad']
                precio = detalle.cleaned_data['precio_unitario']
                total += cantidad * precio

            self.object.total = total
            self.object.save()
            formset.save()

            for detalle in formset:
                producto = detalle.cleaned_data['producto']
                cantidad = detalle.cleaned_data['cantidad']
                producto.stock_actual += cantidad
                producto.save()

                MovimientoInventario.objects.create(
                    producto=producto,
                    tipo='entrada',
                    cantidad=cantidad,
                    motivo='Compra'
                )

            return redirect(self.success_url)

        return render(request, self.template_name, {'form': form, 'formset': formset})

@login_decorador  
class CompraListView(ListView):
    model = Compra
    template_name = 'core/compra_list.html'
    context_object_name = 'compras'
    ordering = ['-fecha']

@login_decorador
class BalanceView(FormView):
    template_name = 'core/balance.html'
    form_class = BalanceForm
    success_url = reverse_lazy('balance')

    def form_valid(self, form):
        mes = form.cleaned_data['mes']
        anio = form.cleaned_data['anio']

        ventas = Venta.objects.filter(fecha__month=mes, fecha__year=anio)
        compras = Compra.objects.filter(fecha__month=mes, fecha__year=anio)

        total_ingresos = sum(v.total for v in ventas)
        total_egresos = sum(c.total for c in compras)
        utilidad = total_ingresos - total_egresos

        Balance.objects.update_or_create(
            mes=mes,
            anio=anio,
            defaults={
                'total_ingresos': total_ingresos,
                'total_egresos': total_egresos,
                'utilidad': utilidad
            }
        )

        context = self.get_context_data(form=form, ventas=ventas, compras=compras,
                                        total_ingresos=total_ingresos,
                                        total_egresos=total_egresos,
                                        utilidad=utilidad,
                                        mes=mes, anio=anio)
        return self.render_to_response(context)

@login_decorador   
class MovimientoInventarioListView(ListView):
    model = MovimientoInventario
    template_name = 'core/movimiento_list.html'
    context_object_name = 'movimientos'
    ordering = ['-fecha']

def exportar_balance_excel(request):
    # Obtener último balance generado
    balance = Balance.objects.order_by('-anio', '-mes').first()

    if not balance:
        return HttpResponse("No hay datos de balance para exportar.")

    wb = Workbook()
    ws = wb.active
    ws.title = "Balance Mensual"

    ws.append(["Balance del Mes", f"{balance.mes:02d}/{balance.anio}"])
    ws.append([])
    ws.append(["Total Ingresos (€)", balance.total_ingresos])
    ws.append(["Total Egresos (€)", balance.total_egresos])
    ws.append(["Utilidad (€)", balance.utilidad])

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename=balance_{balance.mes}_{balance.anio}.xlsx'
    wb.save(response)
    return response

def exportar_balance_pdf(request):
    balance = Balance.objects.order_by('-anio', '-mes').first()

    if not balance:
        return HttpResponse("No hay datos de balance para exportar.")

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename=balance_{balance.mes}_{balance.anio}.pdf'

    p = canvas.Canvas(response, pagesize=A4)
    width, height = A4

    p.setFont("Helvetica-Bold", 16)
    p.drawString(200, 800, "Balance Mensual")

    p.setFont("Helvetica", 12)
    p.drawString(50, 760, f"Mes/Año: {balance.mes:02d}/{balance.anio}")
    p.drawString(50, 730, f"Total Ingresos: € {balance.total_ingresos}")
    p.drawString(50, 710, f"Total Egresos: € {balance.total_egresos}")
    p.drawString(50, 690, f"Utilidad: € {balance.utilidad}")

    p.showPage()
    p.save()
    return response

@login_decorador
class CargarProductosView(View):
    template_name = 'core/cargar_productos.html'

    def get(self, request):
        vista_previa = request.session.pop('vista_previa_productos', None)
        return render(request, self.template_name, {'vista_previa': vista_previa})

    def post(self, request):
        if 'confirmar' in request.POST:
            # Paso 2: Confirmar importación desde sesión
            datos = request.session.get('vista_previa_productos', [])
            creados, duplicados, errores = 0, 0, 0
            for fila in datos:
                if fila['estado'] != 'nuevo':
                    continue
                try:
                    categoria, _ = Categoria.objects.get_or_create(nombre_categoria=fila['categoria'])
                    Producto.objects.create(
                        nombre=fila['nombre'],
                        tipo=fila['tipo'],
                        precio=fila['precio'],
                        stock_actual=fila['stock_actual'],
                        stock_minimo=fila['stock_minimo'],
                        unidad_media=fila['unidad_media'],
                        categoria=categoria
                    )
                    creados += 1
                except:
                    errores += 1
            messages.success(request, f"Se importaron {creados} productos. Errores: {errores}.")
            return redirect('producto_list')

        # Paso 1: Subir archivo y previsualizar
        archivo = request.FILES.get('archivo')
        if not archivo:
            messages.error(request, "Debe seleccionar un archivo Excel válido.")
            return redirect('cargar_productos')

        path = default_storage.save('tmp/' + archivo.name, archivo)
        wb = load_workbook(default_storage.path(path))
        hoja = wb.active

        vista_previa = []
        for i, fila in enumerate(hoja.iter_rows(min_row=2, values_only=True), start=2):
            try:
                nombre, tipo, precio, stock_actual, stock_minimo, unidad_media, categoria = fila
                estado = 'nuevo'
                if not nombre or not precio:
                    estado = 'invalido'
                elif Producto.objects.filter(nombre=nombre).exists():
                    estado = 'duplicado'
                vista_previa.append({
                    'nombre': nombre or '',
                    'tipo': tipo or '',
                    'precio': precio or 0,
                    'stock_actual': stock_actual or 0,
                    'stock_minimo': stock_minimo or 5,
                    'unidad_media': unidad_media or 'unidad',
                    'categoria': categoria or 'Sin categoría',
                    'estado': estado
                })
            except:
                continue

        request.session['vista_previa_productos'] = vista_previa
        return render(request, self.template_name, {'vista_previa': vista_previa})

@login_decorador   
class DashboardView(TemplateView):
    template_name = 'core/dashboard.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        hoy = now()
        mes = hoy.month
        anio = hoy.year

        ingresos = Venta.objects.filter(fecha__month=mes, fecha__year=anio).aggregate(total=Sum('total'))['total'] or 0
        egresos = Compra.objects.filter(fecha__month=mes, fecha__year=anio).aggregate(total=Sum('total'))['total'] or 0
        utilidad = ingresos - egresos

        top = DetallesVenta.objects.filter(venta__fecha__month=mes, venta__fecha__year=anio) \
            .values('producto__nombre') \
            .annotate(total_vendido=Sum('cantidad')) \
            .order_by('-total_vendido')

        producto_top = top[0] if top else {'producto__nombre': 'N/A', 'total_vendido': 0}

        ventas_dia_dict = defaultdict(float)
        for venta in Venta.objects.filter(fecha__month=mes, fecha__year=anio):
            dia = venta.fecha.strftime('%d')
            ventas_dia_dict[dia] += float(venta.total)

        compras_dia_dict = defaultdict(float)
        for compra in Compra.objects.filter(fecha__month=mes, fecha__year=anio):
            dia = compra.fecha.strftime('%d')
            compras_dia_dict[dia] += float(compra.total)

        ventas_dia = [{'day': k, 'total': v} for k, v in sorted(ventas_dia_dict.items())]
        compras_dia = [{'day': k, 'total': v} for k, v in sorted(compras_dia_dict.items())]

        # Top 5 productos para gráfica
        top_nombres = [p['producto__nombre'] for p in top[:5]]
        top_cantidades = [p['total_vendido'] for p in top[:5]]

        context.update({
            'mes': mes,
            'anio': anio,
            'ingresos': ingresos,
            'egresos': egresos,
            'utilidad': utilidad,
            'producto_top': producto_top,
            'ventas_dia': ventas_dia,
            'compras_dia': compras_dia,
            'ventas_labels': [v['day'] for v in ventas_dia],
            'ventas_totales': [v['total'] for v in ventas_dia],
            'compras_labels': [c['day'] for c in compras_dia],
            'compras_totales': [c['total'] for c in compras_dia],
            'top_nombres': top_nombres,
            'top_cantidades': top_cantidades
        })
        return context
