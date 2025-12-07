from __future__ import print_function
import os
import shutil
import datetime

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SCOPES = ["https://www.googleapis.com/auth/drive.file"]

def get_drive_service():
    creds = None
    
    # token.json stores the user's access and refresh tokens
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)

    # If no valid token → open Google login popup
    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(
            "credentials.json", SCOPES
        )
        creds = flow.run_local_server(port=0)

        # Save token for next run
        with open("token.json", "w") as token:
            token.write(creds.to_json())

    service = build("drive", "v3", credentials=creds)
    return service


def backup_sqlite():
    today = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_name = f"loom_backup_{today}.sqlite3"

    source = "db.sqlite3"
    destination = backup_name

    if not os.path.exists(source):
        print("❌ ERROR: db.sqlite3 not found")
        return None

    shutil.copy(source, destination)
    print(f"📦 SQLite backup created: {backup_name}")

    return backup_name


def upload_to_drive(file_path):
    service = get_drive_service()

    file_metadata = {
        "name": os.path.basename(file_path),
        "mimeType": "application/octet-stream"
    }

    media = MediaFileUpload(file_path, resumable=True)

    print("☁ Uploading to Google Drive...")
    uploaded = service.files().create(
        body=file_metadata,
        media_body=media,
        fields="id"
    ).execute()

    print(f"✅ Uploaded! File ID: {uploaded.get('id')}")


if __name__ == "__main__":
    backup_file = backup_sqlite()
    if backup_file:
        upload_to_drive(backup_file)
