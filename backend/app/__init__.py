from pathlib import Path
import sys

from flask import Flask, send_from_directory
from flask_cors import CORS

from .extensions import db, migrate, jwt
from .models import *
from .routes import api


def get_base_dir() -> Path:
    """
    Returns the base directory for both normal Python execution and PyInstaller.

    Normal project structure:
        data-economy/
        ├── backend/
        │   └── app/
        │       └── __init__.py
        └── frontend/
            └── dist/

    In PyInstaller:
        files are unpacked into sys._MEIPASS temporarily.
    """

    if hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)

    # __file__ = backend/app/__init__.py
    # parents[0] = backend/app
    # parents[1] = backend
    # parents[2] = project root
    return Path(__file__).resolve().parents[2]


def create_app():
    base_dir = get_base_dir()
    frontend_dist = base_dir / "frontend" / "dist"

    app = Flask(
        __name__,
        static_folder=str(frontend_dist) if frontend_dist.exists() else None,
        static_url_path="",
    )

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    r"http://localhost:\d+",
                    r"http://127\.0\.0\.1:\d+",
                    r"http://\[::1\]:\d+",
                ]
            }
        },
    )

    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = "randomsecretkey"

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # API routes must be registered before the React catch-all route.
    app.register_blueprint(api, url_prefix="/api")

    @app.route("/")
    def serve_react_index():
        if not frontend_dist.exists():
            return {
                "message": "Frontend build not found. Run `npm run build` inside the frontend folder first."
            }, 404

        return send_from_directory(frontend_dist, "index.html")

    @app.route("/<path:path>")
    def serve_react_routes(path):
        if not frontend_dist.exists():
            return {
                "message": "Frontend build not found. Run `npm run build` inside the frontend folder first."
            }, 404

        requested_file = frontend_dist / path

        if requested_file.exists() and requested_file.is_file():
            return send_from_directory(frontend_dist, path)

        # This is important for React Router routes like:
        # /participant/dashboard
        # /researcher/studies/1
        # /regulator/studies
        return send_from_directory(frontend_dist, "index.html")

    return app