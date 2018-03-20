from django.contrib import admin
from django import forms
from .models import GeoPackage

class GeoPackageAdminForm(forms.ModelForm):

    class Meta:
        model = GeoPackage
        fields = '__all__'


class GeoPackageAdmin(admin.ModelAdmin):
    form = GeoPackageAdminForm
    list_display = ['name', 'slug', 'created', 'last_updated', 'Token']
    readonly_fields = ['name', 'slug', 'created', 'last_updated', 'Token']

admin.site.register(GeoPackage, GeoPackageAdmin)


