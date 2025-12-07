import os

TARGET_FOLDERS = ["templates", "static"]
OUTPUT = "frontend_only.txt"
VALID_EXTS = {".html", ".css", ".js"}

def export_files():
    with open(OUTPUT, "w", encoding="utf-8") as out:
        for folder in TARGET_FOLDERS:
            if not os.path.exists(folder):
                continue

            for root, dirs, files in os.walk(folder):
                for f in files:
                    if any(f.endswith(ext) for ext in VALID_EXTS):
                        path = os.path.join(root, f)
                        out.write("\n" + "=" * 70 + "\n")
                        out.write(f"FILE: {path}\n")
                        out.write("=" * 70 + "\n\n")
                        out.write(open(path, encoding="utf-8").read())
                        out.write("\n")

    print("✔ Export completed → frontend_only.txt")

if __name__ == "__main__":
    export_files()
