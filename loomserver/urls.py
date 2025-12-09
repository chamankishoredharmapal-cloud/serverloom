from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

urlpatterns = [
    # Home route
    path('', lambda request: HttpResponse("Server Loom backend is running!")),

    # Your app routes
    path('accounts/', include('accounts.urls')),

    # Admin route
    path('admin/', admin.site.urls),
]
