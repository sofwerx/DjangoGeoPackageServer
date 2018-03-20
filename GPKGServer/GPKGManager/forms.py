from django import forms
from .models import GeoPackage


class GeoPackageForm(forms.ModelForm):
    class Meta:
        model = GeoPackage
        fields = ['name', 'Token']


