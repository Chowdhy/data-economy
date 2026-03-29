# Flask Backend Setup

Run these commands from the `backend/` folder:

```bash
pip install -r requirements.txt
flask db upgrade
python seed.py
flask run
```

### Researchers

| Name            | Email                              | Password |
|-----------------|------------------------------------|----------|
| Dr Alice Smith  | alice.researcher@example.com       | test123  |
| Dr Bob Jones    | bob.researcher@example.com         | test123  |

---

### Participants

| Name      | Email                             | Password |
|-----------|-----------------------------------|----------|
| John Doe  | john.participant@example.com      | test123  |
| Jane Roe  | jane.participant@example.com      | test123  |
| Sam Lee   | sam.participant@example.com       | test123  |

# React Frontend Setup

Run these commands from the `frontend/` folder:

```bash
npm run dev
```