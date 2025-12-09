from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

urlpatterns = [
    # Home route
    path('', lambda request: HttpResponse("Server Loom backend is running!")),
    
    # App routes
    path('accounts/', include('accounts.urls')),

    # Admin
    path('admin/', admin.site.urls),
]
