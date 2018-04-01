from . import models
from . import serializers
from rest_framework import viewsets, permissions


class GeoPackageViewSet(viewsets.ModelViewSet):
    """ViewSet for the GeoPackage class"""

    queryset = models.GeoPackage.objects.all()
    serializer_class = serializers.GeoPackageSerializer
    permission_classes = []


