from django.shortcuts import render,render_to_response,get_object_or_404,redirect
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.core.urlresolvers import reverse
from django.core.mail import send_mail
from django.views.decorators.csrf import csrf_protect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import User, UserManager


@csrf_protect
def home(request):
	c = {}
	return render(request, 'homePageWorking.html', c)

@csrf_protect
def prototype(request):
	c = {}
	return render(request, 'homePage.html', c)