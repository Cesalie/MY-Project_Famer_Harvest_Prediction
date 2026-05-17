import os
import base64
from email.mime.text import MIMEText
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def get_gmail_service():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists('credentials.json'):
                print("\n[x] ERROR: 'credentials.json' not found!")
                print("    Please download it from Google Cloud Console and place it in this folder.")
                return None
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    return build('gmail', 'v1', credentials=creds)

def test_send(to_email):
    print(f"\n[arrow-repeat] Attempting to send test email to: {to_email}...")
    service = get_gmail_service()
    if not service:
        return

    try:
        message = MIMEText("This is a test email from the Bugesera Harvest Prediction System Gmail Integration. If you see this, it works!")
        message['to'] = to_email
        message['subject'] = "Gmail API Test - Harvest System"
        
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        send_request = service.users().messages().send(
            userId="me",
            body={'raw': raw_message}
        ).execute()
        
        print(f"\n[check-circle] SUCCESS!")
        print(f"    Message ID: {send_request['id']}")
        print("    Check your inbox (and spam folder) for the test email.")
    except Exception as e:
        print(f"\n[x-circle] FAILED: {e}")

if __name__ == "__main__":
    print("="*50)
    print("   GMAIL API TEST SCRIPT")
    print("="*50)
    
    target = input("\nEnter your email address to receive the test: ").strip()
    if target:
        test_send(target)
    else:
        print("No email provided. Exiting.")
