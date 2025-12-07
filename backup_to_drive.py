import os
import datetime
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload  # <-- THIS LINE FIXES THE ERROR

# Google Drive folder ID
FOLDER_ID = "1Vu9f_VGwFv1ZXD3dh7wOSiseclSHjzK0"

# Path to your SQLite DB
DB_PATH = os.path.join(os.getcwd(), "db.sqlite3")

# Backup filename
timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
BACKUP_FILE = f"sqlite_backup_{timestamp}.db"

# Copy DB file
print("📁 Copying SQLite DB...")
with open(DB_PATH, "rb") as src, open(BACKUP_FILE, "wb") as dst:
    dst.write(src.read())

print("☁ Uploading to Google Drive...")

# Google Drive credentials
creds = Credentials.from_service_account_file(
    "service_account.json",
    scopes=["https://www.googleapis.com/auth/drive.file"]
)

drive = build("drive", "v3", credentials=creds)

file_metadata = {
    "name": BACKUP_FILE,
    "parents": [FOLDER_ID]
}

media = MediaFileUpload(BACKUP_FILE, resumable=True)

drive.files().create(
    body=file_metadata,
    media_body=media,
    fields="id"
).execute()

print("✅ Backup completed and uploaded successfully!")
