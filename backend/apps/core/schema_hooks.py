"""
drf_spectacular schema generation hooks
"""


def postprocess_schema_enums(result, generator, request, public, **kwargs):
    """
    Post-process schema to clean up warnings for known patterns
    """
    # This hook can be extended to manipulate the final schema
    return result


def preprocess_exclude_fields_for_warnings(endpoints, **kwargs):
    """
    Filter endpoints to exclude ones that would generate unnecessary warnings
    """
    return endpoints
