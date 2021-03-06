# -*- coding: utf-8 -*-
# Generated by Django 1.11.11 on 2018-03-28 13:04
from __future__ import unicode_literals

from django.db import migrations, models
import django_extensions.db.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='GeoPackage',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('slug', django_extensions.db.fields.AutoSlugField(blank=True, editable=False, populate_from=b'name')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('last_updated', models.DateTimeField(auto_now=True)),
                ('Token', models.TextField(max_length=128)),
                ('File', models.FileField(null=True, upload_to=b'media/geopackages/')),
            ],
            options={
                'ordering': ('-created',),
            },
        ),
    ]
