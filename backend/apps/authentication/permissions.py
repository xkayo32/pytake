"""
Custom permission classes for role-based access control
"""
from rest_framework import permissions
from apps.rbac.models import Role


class HasRBACPermission(permissions.BasePermission):
    """
    Check if user has required RBAC permission
    """
    required_permission = None
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if not self.required_permission:
            return True
        
        # Check if user has permission
        return self.required_permission in (request.user.permissions or [])
    
    def has_object_permission(self, request, view, obj):
        # Check if object belongs to user's organization
        if hasattr(obj, 'organization'):
            return obj.organization == request.user.organization
        
        return True


class IsOrganizerUser(permissions.BasePermission):
    """
    Allow access only to users in the same organization
    """
    
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'organization'):
            return obj.organization == request.user.organization
        
        if hasattr(obj, 'user') and hasattr(obj.user, 'organization'):
            return obj.user.organization == request.user.organization
        
        return False


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Allow access only to object owner or admin
    """
    
    def has_object_permission(self, request, view, obj):
        # Admin can access anything
        if request.user.role == 'admin':
            return True
        
        # Owner can access own object
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        
        # Check organization membership
        if hasattr(obj, 'organization'):
            return obj.organization == request.user.organization
        
        return False


class IsAdmin(permissions.BasePermission):
    """
    Allow access only to admin users
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'admin'
        )


class IsAgent(permissions.BasePermission):
    """
    Allow access only to agent users
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.agent_status == 'active'
        )
