from datetime import date
from typing import Optional, Union

from django.core.exceptions import ValidationError
from django.utils.dateparse import parse_date


def normalize_date(
    value: Optional[Union[str, date]],
    field_name: str = "fecha",
) -> Optional[date]:
    """Convert ISO strings to :class:`datetime.date` and validate the value."""
    if value is None or isinstance(value, date):
        return value

    if isinstance(value, str):
        parsed = parse_date(value)
        if parsed:
            return parsed

    raise ValidationError({field_name: "Fecha inválida"})