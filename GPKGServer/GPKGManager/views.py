from django.views.generic import DetailView, ListView, UpdateView, CreateView
from .models import GeoPackage
from .forms import GeoPackageForm


class GeoPackageListView(ListView):
    model = GeoPackage


class GeoPackageCreateView(CreateView):
    model = GeoPackage
    form_class = GeoPackageForm


class GeoPackageDetailView(DetailView):
    model = GeoPackage


class GeoPackageUpdateView(UpdateView):
    model = GeoPackage
    form_class = GeoPackageForm

