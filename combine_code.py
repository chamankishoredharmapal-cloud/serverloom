import os

# ONLY these folders will be scanned
INCLUDE_DIRS = {
    "accounts",
    "core",
    "templates",
    "static",
    "utils",
    "api",
}

# ALWAYS include these files if they exist
INCLUDE_FILES = {
    "manage.py",
    "requirements.txt",
    "settings.py",
}

# Allowed extensions
INCLUDE_EXTS = {
    ".py", ".html", ".css", ".js", ".json"
}

def combine_files(output_file="my_project_code.txt"):
    with open(output_file, "w", encoding="utf-8") as outfile:

        # Include root-level files
        for file in INCLUDE_FILES:
            if os.path.exists(file):
                outfile.write("\n" + "="*50 + "\n")
                outfile.write(f"FILE START: {file}\n")
                outfile.write("="*50 + "\n")

                with open(file, "r", encoding="utf-8") as f:
                    outfile.write(f.read())

                outfile.write(f"\nFILE END: {file}\n")

        # Walk only allowed folders
        for folder in INCLUDE_DIRS:
            if not os.path.exists(folder):
                continue

            for root, dirs, files in os.walk(folder):
                for file in files:
                    if not any(file.endswith(ext) for ext in INCLUDE_EXTS):
                        continue

                    file_path = os.path.join(root, file)

                    outfile.write("\n" + "="*50 + "\n")
                    outfile.write(f"FILE START: {file_path}\n")
                    outfile.write("="*50 + "\n")

                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            outfile.write(f.read())
                    except:
                        outfile.write("[Error reading file]")

                    outfile.write(f"\nFILE END: {file_path}\n")

    print("🎉 Done! Your clean code is saved in:", output_file)


if __name__ == "__main__":
    combine_files()
