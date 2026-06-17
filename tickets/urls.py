from django.urls import path

from .views import (
    TicketListCreateView,
    TicketDetailView,
    TicketClaimView,
    TicketAssignView,
    TicketStatusView,
    CommentListCreateView,
    AttachmentListCreateView,
    TicketLinkCreateView,
    LabelListCreateView,
    LabelDetailView,
)

urlpatterns = [
    # Tickets
    path('tickets/',                          TicketListCreateView.as_view(),    name='ticket-list-create'),
    path('tickets/<int:pk>/',                 TicketDetailView.as_view(),        name='ticket-detail'),
    path('tickets/<int:pk>/claim/',           TicketClaimView.as_view(),         name='ticket-claim'),
    path('tickets/<int:pk>/assign/',          TicketAssignView.as_view(),        name='ticket-assign'),
    path('tickets/<int:pk>/status/',          TicketStatusView.as_view(),        name='ticket-status'),

    # Comments
    path('tickets/<int:pk>/comments/',        CommentListCreateView.as_view(),   name='ticket-comments'),

    # Attachments
    path('tickets/<int:pk>/attachments/',     AttachmentListCreateView.as_view(), name='ticket-attachments'),

    # Ticket links
    path('tickets/<int:pk>/links/',           TicketLinkCreateView.as_view(),    name='ticket-links'),

    # Labels
    path('labels/',                           LabelListCreateView.as_view(),     name='label-list-create'),
    path('labels/<int:pk>/',                  LabelDetailView.as_view(),         name='label-detail'),
]