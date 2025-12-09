from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

urlpatterns = [
    path('', lambda request: HttpResponse("Server Loom backend is running!")),
    path('accounts/', include('accounts.urls')),
    path('admin/', admin.site.urls),
]
