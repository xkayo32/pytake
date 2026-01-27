"""
Queue models for conversation routing
"""
from django.db import models
from apps.core.models import BaseModel


class Queue(BaseModel):
    """Queue model for managing conversation routing"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='queues'
    )
    department = models.ForeignKey(
        'organizations.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='queues'
    )
    
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Queue settings
    priority = models.IntegerField(default=0)
    max_conversations_per_agent = models.IntegerField(default=10)
    auto_assign = models.BooleanField(default=True)
    
    # Routing strategy
    ROUTING_CHOICES = [
        ('round_robin', 'Round Robin'),
        ('load_balanced', 'Load Balanced'),
        ('skill_based', 'Skill Based'),
    ]
    routing_strategy = models.CharField(
        max_length=50,
        choices=ROUTING_CHOICES,
        default='round_robin'
    )
    
    settings = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'queues'
        ordering = ['-priority', 'name']
        indexes = [
            models.Index(fields=['organization', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.organization.name})"


class AgentSkill(BaseModel):
    """Agent skills for skill-based routing"""
    
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.CASCADE,
        related_name='skills'
    )
    
    name = models.CharField(max_length=100)
    level = models.IntegerField(default=1)  # 1-5
    
    class Meta:
        db_table = 'agent_skills'
        unique_together = [['user', 'name']]
    
    def __str__(self):
        return f"{self.user.full_name} - {self.name} (L{self.level})"
