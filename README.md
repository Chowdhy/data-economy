# Data Economy

## Setup

Backend setup from `backend/`:

```bash
pip install -r requirements.txt
python seed.py
```

Frontend setup from `frontend/`:

```bash
npm install
```

## Run The App

From the repo root, start both services together:

```bash
npm run dev
```

That starts:

- Flask API on `http://127.0.0.1:5000`
- React frontend on `http://localhost:5173`

`npm run dev` automatically runs `flask db upgrade` before starting the backend.

## Test Accounts

### Researchers

| Name            | Email                        | Password |
|-----------------|------------------------------|----------|
| Dr Alice Smith  | alice.researcher@example.com | test123  |
| Dr Bob Jones    | bob.researcher@example.com   | test123  |

### Participants

| Name     | Email                        | Password |
|----------|------------------------------|----------|
| John Doe | john.participant@example.com | test123  |
| Jane Roe | jane.participant@example.com | test123  |
| Sam Lee  | sam.participant@example.com  | test123  |

## Notes

- Study creation supports required and optional fields.
- Participant consent changes are allowed only while a study is `open`.
- Researcher access to participant data is allowed only while a study is `ongoing`.
