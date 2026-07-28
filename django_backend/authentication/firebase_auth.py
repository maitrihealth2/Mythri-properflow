import os
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import firebase_admin
from firebase_admin import auth
from django.contrib.auth import get_user_model

User = get_user_model()

class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return None
        
        id_token = auth_header.split(' ').pop()
        
        try:
            # Check if firebase app is initialized
            if not firebase_admin._apps:
                firebase_admin.initialize_app()
                
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token.get('uid')
            email = decoded_token.get('email', '')
            
            # Get or create a Django User so we have an object to attach to `request.user`
            user, created = User.objects.get_or_create(username=uid, defaults={'email': email})
            
            return (user, decoded_token)
        except Exception as e:
            raise AuthenticationFailed(f"Invalid Firebase token: {str(e)}")
