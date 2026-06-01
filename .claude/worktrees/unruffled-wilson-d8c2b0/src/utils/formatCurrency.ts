export function formatCurrency(value: number, currency: string = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}