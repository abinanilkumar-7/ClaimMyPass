"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Show
from .services import generate_seats_for_show


@receiver(post_save, sender=Show)
def create_show_seats(sender, instance, created, **kwargs):
    if created:
        generate_seats_for_show(instance)
"""
# Seat generation is handled by movies.services
# when a show is created through the application service.