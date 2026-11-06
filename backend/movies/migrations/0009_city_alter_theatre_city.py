
import django.db.models.deletion
from django.db import migrations, models


def migrate_existing_cities(apps, schema_editor):
    City = apps.get_model("movies", "City")
    Theatre = apps.get_model("movies", "Theatre")
    db_alias = schema_editor.connection.alias

    theatres = Theatre.objects.using(db_alias).all()

    for theatre in theatres.iterator():
        city_name = (theatre.city or "").strip()

        if not city_name:
            city_name = "Unknown"

        city, _ = City.objects.using(db_alias).get_or_create(
            name=city_name,
            defaults={
                "state": "",
                "country": "India",
                "is_active": True,
            },
        )

        Theatre.objects.using(db_alias).filter(
            pk=theatre.pk
        ).update(city_ref_id=city.pk)


def reverse_city_data(apps, schema_editor):
    Theatre = apps.get_model("movies", "Theatre")
    db_alias = schema_editor.connection.alias

    for theatre in Theatre.objects.using(db_alias).select_related(
        "city_ref"
    ).iterator():
        Theatre.objects.using(db_alias).filter(
            pk=theatre.pk
        ).update(city=theatre.city_ref.name)


class Migration(migrations.Migration):

    dependencies = [
        ("movies", "0008_movie_is_featured"),
    ]

    operations = [
        migrations.CreateModel(
            name="City",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=100, unique=True)),
                ("state", models.CharField(blank=True, max_length=100)),
                (
                    "country",
                    models.CharField(default="India", max_length=100),
                ),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "verbose_name_plural": "Cities",
                "ordering": ["name"],
            },
        ),
        migrations.AddField(
            model_name="theatre",
            name="city_ref",
            field=models.ForeignKey(
                to="movies.city",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="+",
                null=True,
                blank=True,
            ),
        ),
        migrations.RunPython(
            migrate_existing_cities,
            reverse_city_data,
        ),
        migrations.RemoveField(
            model_name="theatre",
            name="city",
        ),
        migrations.RenameField(
            model_name="theatre",
            old_name="city_ref",
            new_name="city",
        ),
        migrations.AlterField(
            model_name="theatre",
            name="city",
            field=models.ForeignKey(
                to="movies.city",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="theatres",
            ),
        ),
    ]
