from datetime import date, timezone as dt_timezone

from django.contrib.auth.models import Group, User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from unittest.mock import patch

from core.models import Balance, Compra, GastoRecurrente, Proveedor, Transaccion, Venta
from core.utils import (
    calcular_balance_mensual,
    generar_transacciones_recurrentes,
    obtener_balance_mensual,
)

class BalanceCalculationTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="finanzas", password="pass")
        self.proveedor = Proveedor.objects.create(
            nombre="Proveedor", contacto="Contacto", direccion="Calle 1"
        )

    def test_balance_with_fixed_and_financial_costs(self):
        Venta.objects.create(fecha="2024-02-10", total=100, usuario=self.user)
        Compra.objects.create(
            proveedor=self.proveedor,
            fecha="2024-02-11",
            total=20,
        )
        Transaccion.objects.create(
            fecha="2024-02-05",
            monto=10,
            tipo="ingreso",
            categoria="mostrador",
            responsable=self.user,
            naturaleza="operativo",
        )
        Transaccion.objects.create(
            fecha="2024-02-06",
            monto=5,
            tipo="egreso",
            categoria="materia_prima",
            responsable=self.user,
            tipo_costo="variable",
            naturaleza="operativo",
        )
        Transaccion.objects.create(
            fecha="2024-02-06",
            monto=12,
            tipo="egreso",
            categoria="sueldos",
            responsable=self.user,
            tipo_costo="fijo",
            naturaleza="operativo",
        )
        Transaccion.objects.create(
            fecha="2024-02-07",
            monto=7,
            tipo="egreso",
            categoria="otros",
            responsable=self.user,
            tipo_costo="fijo",
            naturaleza="financiero",
        )

        calculo = calcular_balance_mensual(2, 2024)

        self.assertEqual(calculo.ingresos_operativos, 110)
        self.assertEqual(calculo.costos_variables, 25)
        self.assertEqual(calculo.costos_fijos, 12)
        self.assertEqual(calculo.gastos_financieros, 7)
        self.assertEqual(calculo.utilidad_operativa, 73)
        self.assertEqual(calculo.total_ingresos, 110)
        self.assertEqual(calculo.total_egresos, 44)
        self.assertEqual(calculo.utilidad_neta_real, 66)

    def test_balance_recalculates_after_transaction_update_and_delete(self):
        Venta.objects.create(fecha="2024-03-10", total=50, usuario=self.user)
        transaccion = Transaccion.objects.create(
            fecha="2024-03-11",
            monto=10,
            tipo="egreso",
            categoria="otros",
            responsable=self.user,
        )

        first = obtener_balance_mensual(3, 2024)
        self.assertEqual(first["total_egresos"], 10.0)
        self.assertEqual(first["utilidad_neta_real"], 40.0)

        transaccion.monto = 20
        transaccion.save()
        second = obtener_balance_mensual(3, 2024)
        self.assertEqual(second["total_egresos"], 20.0)
        self.assertEqual(second["utilidad_neta_real"], 30.0)

        transaccion.delete()
        third = obtener_balance_mensual(3, 2024)
        self.assertEqual(third["total_egresos"], 0.0)
        self.assertEqual(third["utilidad_neta_real"], 50.0)

    def test_balance_updates_immediately_on_purchase_and_transaction(self):
        Venta.objects.create(fecha="2024-02-10", total=80, usuario=self.user)
        balance = Balance.objects.get(mes=2, anio=2024)
        self.assertEqual(balance.total_ingresos, 80)
        self.assertEqual(balance.total_egresos, 0)

        Compra.objects.create(
            proveedor=self.proveedor,
            fecha="2024-02-11",
            total=30,
        )
        balance.refresh_from_db()
        self.assertEqual(balance.total_egresos, 30)
        self.assertEqual(balance.utilidad, 50)

        Transaccion.objects.create(
            fecha="2024-02-15",
            monto=10,
            tipo="egreso",
            categoria="materia_prima",
            responsable=self.user,
            tipo_costo="variable",
            naturaleza="operativo",
        )
        balance.refresh_from_db()
        self.assertEqual(balance.total_egresos, 40)
        self.assertEqual(balance.costos_variables, 40)
        self.assertEqual(balance.utilidad, 40)


class RecurringExpensesTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="admin", password="pass")

    def test_recurring_expenses_are_monthly_idempotent(self):
        gasto = GastoRecurrente.objects.create(
            nombre="Alquiler",
            categoria="alquiler",
            monto=100,
            dia_corte=15,
            activo=True,
            naturaleza="operativo",
            tipo_costo="fijo",
            responsable=self.user,
        )

        created = generar_transacciones_recurrentes(date(2024, 1, 5))
        self.assertEqual(len(created), 1)
        self.assertEqual(Transaccion.objects.count(), 1)
        gasto.refresh_from_db()
        self.assertEqual(gasto.ultima_generacion, date(2024, 1, 15))

        created_again = generar_transacciones_recurrentes(date(2024, 1, 20))
        self.assertEqual(len(created_again), 0)
        self.assertEqual(Transaccion.objects.count(), 1)

        created_next = generar_transacciones_recurrentes(date(2024, 2, 5))
        self.assertEqual(len(created_next), 1)
        self.assertEqual(Transaccion.objects.count(), 2)


class DashboardBreakEvenTest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_break_even_uses_real_fixed_costs(self):
        with patch("core.api_views.now") as mock_now:
            mock_now.return_value = timezone.datetime(
                2024, 1, 10, tzinfo=dt_timezone.utc
            )
            Venta.objects.create(
                fecha="2024-01-10", total=1000, usuario=self.user
            )
            Transaccion.objects.create(
                fecha="2024-01-05",
                monto=200,
                tipo="egreso",
                categoria="materia_prima",
                responsable=self.user,
                tipo_costo="variable",
                naturaleza="operativo",
            )
            Transaccion.objects.create(
                fecha="2024-01-06",
                monto=100,
                tipo="egreso",
                categoria="sueldos",
                responsable=self.user,
                tipo_costo="fijo",
                naturaleza="operativo",
            )
            Transaccion.objects.create(
                fecha="2024-01-07",
                monto=50,
                tipo="egreso",
                categoria="otros",
                responsable=self.user,
                tipo_costo="fijo",
                naturaleza="estructural",
            )

            resp = self.client.get("/api/dashboard/")

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["fixed_costs"], 150.0)
        self.assertAlmostEqual(data["break_even_operativo"], 125.0)
        self.assertAlmostEqual(data["break_even_total"], 187.5)
        self.assertAlmostEqual(data["break_even"], 187.5)