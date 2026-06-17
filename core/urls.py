from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Django admin
    path('admin/', admin.site.urls),

    # API endpoints
    path('api/', include('accounts.urls')),
    path('api/', include('departments.urls')),
    path('api/', include('tickets.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('configuration.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)