# Project Structure

`	ext
Maitri-V5/
├── .gitignore
├── PRIVACY_POLICY.md
├── README.md
├── assets
├── backend
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── ai_engine
│   │   └── __init__.py
│   ├── api
│   │   └── __init__.py
│   ├── app.py
│   ├── assets
│   │   └── comfort_song.wav
│   ├── backend_errors.log
│   ├── core
│   │   ├── brain
│   │   │   ├── __init__.py
│   │   │   ├── analyst.py
│   │   │   ├── emotion_detector.py
│   │   │   ├── pattern_analyzer.py
│   │   │   └── state_tracker.py
│   │   ├── config
│   │   │   ├── .env.example
│   │   │   └── .env.local
│   │   ├── database
│   │   │   ├── __init__.py
│   │   │   ├── alembic
│   │   │   │   ├── README
│   │   │   │   ├── env.py
│   │   │   │   ├── script.py.mako
│   │   │   │   └── versions
│   │   │   │       └── 264963ca7e56_optimize_and_document_tables.py
│   │   │   ├── alembic.ini
│   │   │   └── models.py
│   │   └── security
│   │       └── crisis_handler.py
│   ├── db
│   ├── finetuning
│   │   ├── 00_parse_documents.py
│   │   ├── 00b_extract_behaviors.py
│   │   ├── 01_build_dataset.py
│   │   ├── 02_train.py
│   │   ├── 03_evaluate.py
│   │   ├── 04_plot_results.py
│   │   ├── 05_inference_test.py
│   │   ├── Maitri_Sarvam30B_Colab.ipynb
│   │   ├── README.md
│   │   ├── data
│   │   │   ├── behavioral_conversations.jsonl
│   │   │   ├── eval.jsonl
│   │   │   ├── raw_chunks.jsonl
│   │   │   └── train.jsonl
│   │   ├── export_to_rag_docs.py
│   │   ├── requirements_finetune.txt
│   │   └── results
│   │       ├── eval_metrics.json
│   │       ├── inference_comparison.json
│   │       └── training_log.json
│   ├── knowledge
│   ├── memory
│   ├── modules
│   │   ├── authentication
│   │   │   ├── api.py
│   │   │   └── service.py
│   │   ├── consultation
│   │   │   └── api.py
│   │   ├── dashboard
│   │   │   └── api.py
│   │   ├── feedback
│   │   │   └── api.py
│   │   ├── knowledge
│   │   │   ├── __init__.py
│   │   │   ├── loader.py
│   │   │   └── retriever.py
│   │   ├── profile
│   │   │   └── service.py
│   │   └── voice
│   │       ├── api.py
│   │       ├── api_streaming.py
│   │       ├── stt_batcher.py
│   │       └── vocal_engine.py
│   ├── providers
│   │   ├── firebase
│   │   │   └── firebase_rest.py
│   │   └── sarvam
│   │       ├── sarvam_client.py
│   │       └── voice_client.py
│   ├── rag
│   ├── requirements.txt
│   ├── reset_db.py
│   ├── reset_pw.py
│   ├── run_dev.py
│   ├── runtime.txt
│   └── services
│       └── __init__.py
├── cf_backend.log
├── cf_backend_err.log
├── cf_backend_out.log
├── cf_frontend.log
├── deployment
│   ├── docker
│   │   └── docker-compose.prod.yml
│   ├── nginx
│   │   └── nginx.conf
│   ├── render
│   │   └── render.yaml
│   └── scripts
│       └── setup_windows.ps1
├── docs
│   ├── api
│   ├── architecture
│   │   └── architecture_flow.html
│   ├── development
│   └── knowledge
│       ├── Knowledge 1 - Therapy .pdf
│       ├── Psychodynamic theory.docx
│       └── docs
│           ├── act_and_general.txt
│           ├── cbt.txt
│           ├── dbt.txt
│           ├── knowledge1_therapy.txt
│           ├── psychodynamic_theory.txt
│           ├── psychodynamic_theory_full.txt
│           ├── structured
│           │   └── therapy_techniques.json
│           └── transcripts
│               └── sample_dialogues.json
├── frontend
│   ├── .env.local
│   ├── DESIGN.md
│   ├── app
│   │   ├── feedback
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── history
│   │   │   └── page.tsx
│   │   ├── home
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── login
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   ├── profile
│   │   │   └── page.tsx
│   │   ├── text-chat
│   │   │   └── page.tsx
│   │   └── voice-chat
│   │       └── page.tsx
│   ├── core
│   │   ├── api.ts
│   │   ├── firebase.ts
│   │   └── providers.tsx
│   ├── modules
│   │   ├── authentication
│   │   │   └── frontend
│   │   │       └── page.tsx
│   │   ├── consultation
│   │   │   └── frontend
│   │   │       └── page.tsx
│   │   ├── dashboard
│   │   │   └── frontend
│   │   │       └── page.tsx
│   │   ├── feedback
│   │   │   └── frontend
│   │   │       └── page.tsx
│   │   ├── history
│   │   │   └── frontend
│   │   │       └── page.tsx
│   │   ├── profile
│   │   │   └── frontend
│   │   │       └── page.tsx
│   │   └── voice
│   │       └── frontend
│   │           └── page.tsx
│   ├── next-env.d.ts
│   ├── next.config.js
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── public
│   │   ├── Meshy_AI_Character_output.glb
│   │   ├── assets
│   │   │   └── background.png
│   │   ├── desktop_bg.webm
│   │   ├── mobile_bg.webm
│   │   └── models
│   │       └── Meshy_AI_Character_output.glb
│   ├── shared
│   │   ├── components
│   │   │   ├── BottomNav.tsx
│   │   │   ├── ExerciseOverlay.tsx
│   │   │   └── TopNav.tsx
│   │   ├── hooks
│   │   │   ├── useDOMTerrain.ts
│   │   │   ├── useEmotionalDecay.ts
│   │   │   ├── useFriendshipSystem.ts
│   │   │   ├── useMemorySystem.ts
│   │   │   ├── useMitraPresence.ts
│   │   │   └── useReducedMotion.ts
│   │   ├── hooks_app
│   │   │   └── useMitraPresence.ts
│   │   └── stores
│   │       └── mitraStore.ts
│   └── tsconfig.json
├── implementation_plan.md
├── pinggy_backend_err.log
├── pinggy_backend_out.log
├── project_structure.md
├── training
│   ├── datasets
│   │   └── finetuning_datasets
│   │       ├── analyst_sft_dataset.jsonl
│   │       └── maitri_sft_dataset.jsonl
│   ├── evaluation
│   ├── exports
│   ├── finetuning
│   │   └── prepare_finetuning_dataset.py
│   └── notebooks
├── tunnel.log
├── tunnel_backend.log
├── tunnel_backend_err.log
└── tunnel_err.log
`
