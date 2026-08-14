import os
import re

directories_to_scan = [
    r"d:\Copy\V4\Maitri New\frontend",
    r"d:\Copy\V4\Maitri New\backend"
]

exclude_dirs = {'.git', 'node_modules', 'venv', '__pycache__', '.next', 'build', 'dist', '.gemini'}
extensions = {'.py', '.ts', '.tsx', '.js', '.jsx', '.html', '.md', '.json', '.css', '.mdx', '.txt', '.env.local', '.jsonl', '.ipynb'}

# Word boundary regex to ensure we only replace the exact word, not substrings of other words.
# We also include case-insensitive replacement if the exact casing isn't strictly Maitri/MAITRI/maitri, but
# doing it explicitly handles most cases perfectly.
replacements = [
    (re.compile(r'maitri'), 'mythri'),
    (re.compile(r'Maitri'), 'Mythri'),
    (re.compile(r'MAITRI'), 'MYTHRI')
]

count = 0
for root_dir in directories_to_scan:
    for root, dirs, files in os.walk(root_dir):
        # Mutate dirs in-place to skip excluded directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in extensions or file == '.env.local':
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    original_content = content
                    for regex, replacement in replacements:
                        content = regex.sub(replacement, content)
                        
                    if content != original_content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(content)
                        count += 1
                        print(f"Updated: {filepath}")
                except UnicodeDecodeError:
                    pass # Skip binary or non-utf8 files
                except Exception as e:
                    print(f"Failed processing {filepath}: {e}")

print(f"\nDone! Updated {count} files.")
