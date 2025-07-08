from django.db import migrations

TRANSLATIONS = {
    "Drinks": "Bebidas",
    "Beverages": "Bebidas",
    "Ingredients": "Ingredientes",
    "Ingredient": "Ingredientes",
    "Other prepared foods": "Otros alimentos preparados",
    "Other foods": "Otros alimentos preparados",
}

def forwards(apps, schema_editor):
    Categoria = apps.get_model("core", "Categoria")
    for en, es in TRANSLATIONS.items():
        Categoria.objects.filter(nombre_categoria__iexact=en).update(nombre_categoria=es)

def backwards(apps, schema_editor):
    # No sensible reverse transformation
    pass

class Migration(migrations.Migration):
    dependencies = [
        ("core", "0007_prepopulate_categories"),
    ]
    operations = [migrations.RunPython(forwards, backwards)]