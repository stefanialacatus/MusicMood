# MusicMood

MusicMood is an AI-powered application where users can write a short text describing how they’re feeling or how their day went and receive song recommendations matched to their mood. Users can create accounts, manage their favorite songs, get personalized recommendations from their library, and listen to the songs directly in the app.

**Technologies Used:**
- AI Model: SamLowe/roberta-base-go_emotions from Hugging Face Transformers for emotion detection
- Lyrics Source: Genius API
- Backend: Python, FastAPI, SQLAlchemy
- Database Integration: PostgreSQL
- Frontend: React, CSS

**LLM Assistance:** ChatGPT was used as an advisory tool to help decide what AI Models and libraries were most suited for this app, as well as to troubleshoot persistent coding errors during development.
**LLM Hallucination:** During troubleshooting the LLM suffered many "hallucinations" where it suggested incorrect API syntax or nonexistant Python functions. These problems were resolved by carefully reviewing the code and finding the real problems.
**Technical Hurdle:** Because the model returns 28 emotions, it initially produced song recommendations with low relevance. To resolve this, I mapped the 28 emotions into 7 mood groups, allowing the app to more accurately match user input to songs that fit the intended mood.
