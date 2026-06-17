from django.urls import path

from .views import (
    GroupListCreateView,
    GroupDetailView,
    GroupMemberListView,
    AddRemoveMemberView,
    assignee_search,
    my_groups,
)

urlpatterns = [
    # Group management
    path('groups/',                    GroupListCreateView.as_view(),  name='group-list-create'),
    path('groups/search/',             assignee_search,                name='assignee-search'),
    path('groups/mine/',               my_groups,                      name='my-groups'),
    path('groups/<int:pk>/',           GroupDetailView.as_view(),      name='group-detail'),
    path('groups/<int:pk>/members/',   GroupMemberListView.as_view(),  name='group-member-list'),
    path('groups/<int:pk>/members/add-remove/', AddRemoveMemberView.as_view(), name='group-member-add-remove'),
]