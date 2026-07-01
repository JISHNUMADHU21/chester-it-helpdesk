from django.urls import path
from .views import (
    StatusListCreateView,       StatusDetailView,
    PriorityListCreateView,     PriorityDetailView,
    UrgencyListCreateView,      UrgencyDetailView,
    WorkTypeListCreateView,     WorkTypeDetailView,
    ComponentListCreateView,    ComponentDetailView,
    AnnouncementListCreateView, AnnouncementDetailView,
    AnnouncementAttachmentListCreateView, AnnouncementAttachmentDetailView,
    HomePageLayoutView,
)

urlpatterns = [
    # Status
    path('config/statuses/',              StatusListCreateView.as_view(),       name='status-list-create'),
    path('config/statuses/<int:pk>/',     StatusDetailView.as_view(),           name='status-detail'),

    # Priority
    path('config/priorities/',            PriorityListCreateView.as_view(),     name='priority-list-create'),
    path('config/priorities/<int:pk>/',   PriorityDetailView.as_view(),         name='priority-detail'),

    # Urgency
    path('config/urgencies/',             UrgencyListCreateView.as_view(),      name='urgency-list-create'),
    path('config/urgencies/<int:pk>/',    UrgencyDetailView.as_view(),          name='urgency-detail'),

    # Work Type
    path('config/work-types/',            WorkTypeListCreateView.as_view(),     name='worktype-list-create'),
    path('config/work-types/<int:pk>/',   WorkTypeDetailView.as_view(),         name='worktype-detail'),

    # Component
    path('config/components/',            ComponentListCreateView.as_view(),    name='component-list-create'),
    path('config/components/<int:pk>/',   ComponentDetailView.as_view(),        name='component-detail'),

    # Announcements
    path('config/announcements/',          AnnouncementListCreateView.as_view(), name='announcement-list-create'),
    path('config/announcements/<int:pk>/', AnnouncementDetailView.as_view(),     name='announcement-detail'),

    # Announcement Attachments
    path(
        'config/announcements/<int:announcement_id>/attachments/',
        AnnouncementAttachmentListCreateView.as_view(),
        name='announcement-attachment-list-create',
    ),
    path(
        'config/announcements/<int:announcement_id>/attachments/<int:pk>/',
        AnnouncementAttachmentDetailView.as_view(),
        name='announcement-attachment-detail',
    ),

    # Home Page Layout
    path('config/homepage-layout/', HomePageLayoutView.as_view(), name='homepage-layout'),
]