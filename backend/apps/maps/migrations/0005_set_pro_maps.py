from django.db import migrations


def set_pro_maps(apps, schema_editor):
    """Los mapas premium (no base) requieren el plan Pro para comprarse."""
    Map = apps.get_model("maps", "Map")
    Map.objects.filter(
        slug__in=["ancient", "anubis", "inferno", "nuke"]
    ).update(requires_pro_plan=True)


def unset_pro_maps(apps, schema_editor):
    Map = apps.get_model("maps", "Map")
    Map.objects.filter(
        slug__in=["ancient", "anubis", "inferno", "nuke"]
    ).update(requires_pro_plan=False)


class Migration(migrations.Migration):
    dependencies = [
        ("maps", "0004_map_requires_pro_plan"),
    ]

    operations = [
        migrations.RunPython(set_pro_maps, unset_pro_maps),
    ]
