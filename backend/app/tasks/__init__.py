"""
Background Tasks Module

Contains Celery tasks for asynchronous processing
"""

from app.tasks.celery_app import celery_app

__all__ = ["celery_app"]
