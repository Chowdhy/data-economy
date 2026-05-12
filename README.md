# Running the App Locally

## 1. Backend setup

From the project root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2. Apply database migrations

From `backend/`:

```bash
flask --app app:create_app db upgrade
```

## 3. Seed demo data

From `backend/`:

Seed the data to demonstrate k-anonymity and l-diversity:

```bash
python seed.py --participants 1000 --studies 8
```

## 4. Serve the frontend through Flask

From the project root:

```bash
cd frontend
npm install
npm run build
cd ../backend
source .venv/bin/activate
flask --app app:create_app run

```

Open:

```txt
http://127.0.0.1:5000
```

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Regulator | `regulator@gmail.com` | `admin123` |
| Researcher | `alice@gmail.com` | `test123` |
| Researcher | `bob@gmail.com` | `test123` |
| Participant | `john@gmail.com` | `test123` |
| Participant | `jane@gmail.com` | `test123` |
| Participant | `sam@gmail.com` | `test123` |
