from django.urls import path
from . import views

urlpatterns = [
    path('compute/', views.compute_ahp, name='compute_ahp'),
]