from django.conf.urls import url, include
from rest_framework import routers

from . import api
from . import views

router = routers.DefaultRouter()
router.register(r'geopackage', api.GeoPackageViewSet)


urlpatterns = (
    # urls for Django Rest Framework API
    url(r'^api/v1/', include(router.urls)),
)

urlpatterns += (
    # urls for GeoPackage
    url(r'^GPKGManager/geopackage/$', views.GeoPackageListView.as_view(), name='GPKGManager_geopackage_list'),
    url(r'^GPKGManager/geopackage/create/$', views.GeoPackageCreateView.as_view(), name='GPKGManager_geopackage_create'),
    url(r'^GPKGManager/geopackage/detail/(?P<slug>\S+)/$', views.GeoPackageDetailView.as_view(), name='GPKGManager_geopackage_detail'),
    url(r'^GPKGManager/geopackage/update/(?P<slug>\S+)/$', views.GeoPackageUpdateView.as_view(), name='GPKGManager_geopackage_update'),
)

