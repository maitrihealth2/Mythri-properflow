import os
import re

ignore_dirs = {'.git', 'venv', '.venv', 'node_modules', '__pycache__', 'dist', 'build', '.idea', '.vscode'}
target_files = [
    "scratch.py",
    "scratch_replace.py",
    "test_sarvam.py",
    "run_audit.py",
    "test_consultation_flow.py",
    "test_error.py",
    "test_load_live.py",
    "test_quality_concurrent.py",
    "validate_phase2_2.py",
    "verify_phase3_3.py",
    "verify_phase3_4.py",
    "05_inference_test.py"
]

target_basenames = [f.replace('.py', '') for f in target_files]

references = {f: [] for f in target_files}

base_dir = r"d:\Copy\v3\Maitri New"

for root, dirs, files in os.walk(base_dir):
    dirs[:] = [d for d in dirs if d not in ignore_dirs]
    
    for filename in files:
        # Don't search inside the target files themselves for their own names, except to check cross-references
        # Actually it's fine, we want to know ALL references.
        # But exclude the scan scripts.
        if filename in ['scan_dev_files.py', 'scan_dependencies.py']:
            continue
            
        file_path = os.path.join(root, filename)
        rel_path = os.path.relpath(file_path, base_dir)
        
        # Only check text files
        if filename.endswith(('.py', '.md', '.txt', '.sh', '.yml', '.yaml', '.json', '.html', 'Dockerfile')):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    for t_file, t_base in zip(target_files, target_basenames):
                        # skip if we are scanning the file itself
                        if os.path.basename(rel_path) == t_file:
                            continue
                            
                        # Search for either the full filename or the module import format
                        if t_file in content or re.search(r'\b' + re.escape(t_base) + r'\b', content):
                            references[t_file].append(rel_path)
            except Exception:
                pass

for t_file, refs in references.items():
    print(f"[{t_file}]")
    if refs:
        for r in set(refs):
            print(f"  - {r}")
    else:
        print("  - NO REFERENCES FOUND")
    print()
