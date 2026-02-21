"""
Custom middleware for PyTake
"""
from django.http import HttpResponsePermanentRedirect
from django.urls import resolve, Resolver404


class TrailingSlashMiddleware:
    """
    Middleware to handle URLs with or without trailing slashes.

    Since APPEND_SLASH = False, DRF routers create URLs with trailing slashes,
    but frontend may call without trailing slashes. This middleware redirects
    requests without trailing slash to the version with trailing slash.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only process API requests
        if request.path.startswith('/api/v1/'):
            # If URL doesn't end with slash, try adding it
            if not request.path.endswith('/'):
                new_path = request.path + '/'

                # Check if the URL with slash exists
                try:
                    resolve(new_path)
                    # If it exists, redirect to it (preserving query string)
                    if request.META.get('QUERY_STRING'):
                        new_path = f"{new_path}?{request.META['QUERY_STRING']}"

                    # Use 307 to preserve method (important for POST, PUT, DELETE)
                    from django.http import HttpResponse
                    response = HttpResponse(status=307)
                    response['Location'] = new_path
                    return response
                except Resolver404:
                    # URL with slash doesn't exist, continue normally
                    pass

        return self.get_response(request)
