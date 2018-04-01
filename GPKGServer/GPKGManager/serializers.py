from . import models

from rest_framework import serializers


class GeoPackageSerializer(serializers.ModelSerializer):

    class Meta:
        model = models.GeoPackage
        fields = (
            'slug', 
            'name', 
            'created', 
            'last_updated', 
            'Token', 
			'File'
        )


