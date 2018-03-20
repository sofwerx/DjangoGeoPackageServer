import unittest
from django.core.urlresolvers import reverse
from django.test import Client
from .models import GeoPackage
from django.contrib.auth.models import User
from django.contrib.auth.models import Group
from django.contrib.contenttypes.models import ContentType


def create_django_contrib_auth_models_user(**kwargs):
    defaults = {}
    defaults["username"] = "username"
    defaults["email"] = "username@tempurl.com"
    defaults.update(**kwargs)
    return User.objects.create(**defaults)


def create_django_contrib_auth_models_group(**kwargs):
    defaults = {}
    defaults["name"] = "group"
    defaults.update(**kwargs)
    return Group.objects.create(**defaults)


def create_django_contrib_contenttypes_models_contenttype(**kwargs):
    defaults = {}
    defaults.update(**kwargs)
    return ContentType.objects.create(**defaults)


def create_geopackage(**kwargs):
    defaults = {}
    defaults["name"] = "name"
    defaults["Token"] = "Token"
    defaults.update(**kwargs)
    return GeoPackage.objects.create(**defaults)


class GeoPackageViewTest(unittest.TestCase):
    '''
    Tests for GeoPackage
    '''
    def setUp(self):
        self.client = Client()

    def test_list_geopackage(self):
        url = reverse('GPKGManager_geopackage_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_create_geopackage(self):
        url = reverse('GPKGManager_geopackage_create')
        data = {
            "name": "name",
            "Token": "Token",
        }
        response = self.client.post(url, data=data)
        self.assertEqual(response.status_code, 302)

    def test_detail_geopackage(self):
        geopackage = create_geopackage()
        url = reverse('GPKGManager_geopackage_detail', args=[geopackage.slug,])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_update_geopackage(self):
        geopackage = create_geopackage()
        data = {
            "name": "name",
            "Token": "Token",
        }
        url = reverse('GPKGManager_geopackage_update', args=[geopackage.slug,])
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 302)


