from django.shortcuts import render,render_to_response,get_object_or_404,redirect
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.core.urlresolvers import reverse
from django.core.mail import send_mail
from django.views.decorators.csrf import csrf_protect, csrf_exempt
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import User, UserManager

from GPKGManager.models import GeoPackage

@csrf_protect
def home(request):
	c = {'geopackages':GeoPackage.objects.all()}
	return render(request, 'homePageWorking.html', c)


def retrieveGPKG(request):
	gpkg = GeoPackage.objects.filter(id=request.GET.get("id")).first()
	
	#return JsonResponse({"data":gpkg.get_data(),"name":gpkg.name,"token":gpkg.Token})
	return JsonResponse({"name":gpkg.name,"url":gpkg.File.url})#,"name":gpkg.name,"token":gpkg.Token})

@csrf_exempt
def createGeoPackage(request):
	#print(request.POST);
	#print(request.FILES);
	newGPKG = GeoPackage.objects.create(File = request.FILES['file-0'], Token = request.POST["Name"],name = request.POST["Name"])
	newGPKG.save();
	#gpkg = GeoPackage.objects.filter(id=request.GET.get("id")).first()
	return JsonResponse({"name":newGPKG.name,"id":newGPKG.id,"filepath":newGPKG.File.path,})

@csrf_protect
def prototype(request):
	c = {'geopackages':GeoPackage.objects.all()}
	return render(request, 'homePage.html', c)