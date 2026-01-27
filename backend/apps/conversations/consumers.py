"""
WebSocket consumers for real-time chat
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth.models import AnonymousUser


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat
    
    Connection: ws://localhost:8000/ws/chat/{conversation_id}/
    
    Messages:
    - {type: 'chat_message', text: '...', user_id: '...'}
    - {type: 'typing', user_id: '...'}
    - {type: 'user_joined', user_id: '...'}
    - {type: 'user_left', user_id: '...'}
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        self.user = self.scope['user']
        
        # Authenticate user
        if not await self.authenticate_user():
            await self.close()
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Notify others
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user_id': str(self.user.id),
                'user_name': self.user.full_name,
                'timestamp': timezone.now().isoformat()
            }
        )
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_left',
                'user_id': str(self.user.id),
                'user_name': self.user.full_name,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Receive message from WebSocket"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'chat_message':
                await self.handle_chat_message(data)
            elif message_type == 'typing':
                await self.handle_typing(data)
            elif message_type == 'mark_read':
                await self.handle_mark_read(data)
            
        except json.JSONDecodeError:
            await self.send_error('Invalid JSON')
        except Exception as e:
            await self.send_error(str(e))
    
    async def handle_chat_message(self, data):
        """Handle incoming chat message"""
        text = data.get('text')
        
        if not text:
            await self.send_error('Message text required')
            return
        
        # Save message to database
        message_id = await self.save_message(text)
        
        # Broadcast to group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message_id': message_id,
                'text': text,
                'user_id': str(self.user.id),
                'user_name': self.user.full_name,
                'timestamp': timezone.now().isoformat()
            }
        )
    
    async def handle_typing(self, data):
        """Handle typing indicator"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing',
                'user_id': str(self.user.id),
                'user_name': self.user.full_name,
                'timestamp': timezone.now().isoformat()
            }
        )
    
    async def handle_mark_read(self, data):
        """Handle mark conversation as read"""
        await self.mark_conversation_read()
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'conversation_read',
                'user_id': str(self.user.id),
                'timestamp': timezone.now().isoformat()
            }
        )
    
    # Event handlers
    async def chat_message(self, event):
        """Send chat message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message_id': event['message_id'],
            'text': event['text'],
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'timestamp': event['timestamp']
        }))
    
    async def typing(self, event):
        """Send typing indicator to WebSocket"""
        # Don't send to self
        if str(self.user.id) == event['user_id']:
            return
        
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'timestamp': event['timestamp']
        }))
    
    async def user_joined(self, event):
        """Send user joined notification"""
        await self.send(text_data=json.dumps({
            'type': 'user_joined',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'timestamp': event['timestamp']
        }))
    
    async def user_left(self, event):
        """Send user left notification"""
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'timestamp': event['timestamp']
        }))
    
    async def conversation_read(self, event):
        """Send conversation marked as read notification"""
        await self.send(text_data=json.dumps({
            'type': 'conversation_read',
            'user_id': event['user_id'],
            'timestamp': event['timestamp']
        }))
    
    async def send_error(self, message):
        """Send error message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message,
            'timestamp': timezone.now().isoformat()
        }))
    
    # Database operations
    @database_sync_to_async
    def authenticate_user(self):
        """Authenticate user from token"""
        try:
            token = self.scope['query_string'].decode().split('token=')[1]
            payload = AccessToken(token)
            self.user = User.objects.get(id=payload['user_id'])
            return True
        except:
            self.user = AnonymousUser()
            return False
    
    @database_sync_to_async
    def save_message(self, text):
        """Save message to database"""
        from .models import ConversationLog
        from django.utils import timezone
        
        log = ConversationLog.objects.create(
            conversation_id=self.conversation_id,
            user=self.user,
            event_type='message_sent',
            message=text,
            event_data={'source': 'websocket'}
        )
        
        return str(log.id)
    
    @database_sync_to_async
    def mark_conversation_read(self):
        """Mark conversation as read"""
        from .models import Conversation
        from django.utils import timezone
        
        conversation = Conversation.objects.get(id=self.conversation_id)
        conversation.is_unread = False
        conversation.save()


from django.utils import timezone
from apps.authentication.models import User
