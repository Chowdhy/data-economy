from pathlib import Path
import sys

from flask import Flask, send_from_directory
from flask_cors import CORS

from .extensions import db, migrate, jwt
from .models import *
from .routes import api


def get_base_dir() -> Path:
    if hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)

    # backend/app/__init__.py -> backend -> project root
    return Path(__file__).resolve().parents[2]


def find_frontend_build_dir(base_dir: Path) -> Path | None:
    possible_paths = [
        base_dir / "frontend" / "dist",
        base_dir / "frontend" / "build" / "client",
        base_dir / "frontend" / "build",
    ]

    for path in possible_paths:
        if (path / "index.html").exists():
            return path

    return None


def create_app():
    base_dir = get_base_dir()
    frontend_build_dir = find_frontend_build_dir(base_dir)

    print("BASE DIR:", base_dir)
    print("FRONTEND BUILD DIR:", frontend_build_dir)

    # Disable Flask's automatic /static route.
    # We will serve the React build ourselves below.
    app = Flask(__name__, static_folder=None)

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

    app.register_blueprint(api, url_prefix="/api")

    @app.route("/")
    def serve_react_index():
        if frontend_build_dir is None:
            return {
                "message": (
                    "Frontend build not found. Run `npm run build` inside the frontend folder first. "
                    "Expected one of: frontend/dist, frontend/build/client, or frontend/build."
                )
            }, 404

        return send_from_directory(frontend_build_dir, "index.html")

    @app.route("/assets/<path:filename>")
    def serve_react_assets(filename):
        if frontend_build_dir is None:
            return {"message": "Frontend build not found."}, 404

        return send_from_directory(frontend_build_dir / "assets", filename)

    @app.route("/<path:path>")
    def serve_react_routes(path):
        if frontend_build_dir is None:
            return {
                "message": (
                    "Frontend build not found. Run `npm run build` inside the frontend folder first. "
                    "Expected one of: frontend/dist, frontend/build/client, or frontend/build."
                )
            }, 404

        requested_file = frontend_build_dir / path

        if requested_file.exists() and requested_file.is_file():
            return send_from_directory(frontend_build_dir, path)

        return send_from_directory(frontend_build_dir, "index.html")

    return app