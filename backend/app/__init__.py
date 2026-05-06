import os

from flask import Flask, send_from_directory
from flask_cors import CORS
from .extensions import db, migrate, jwt
from .models import *
from .routes import api


def create_app():
    app = Flask(__name__)

    CORS(
        app,
        resources={
            r"/*": {
                "origins": [
                    r"http://localhost:\d+",
                    r"http://127\.0\.0\.1:\d+",
                    r"http://\[::1\]:\d+",
                    "https://data-economy.onrender.com",
                ]
            }
        },
    )

    database_url = os.getenv("DATABASE_URL", "sqlite:///app.db")

    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv(
        "JWT_SECRET_KEY",
        "dev-only-change-me-please-make-this-longer",
    )

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    app.register_blueprint(api, url_prefix="/api")

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    frontend_build_dir = os.path.join(base_dir, "frontend", "build", "client")

    print(f"BASE DIR: {base_dir}")
    print(
        "FRONTEND BUILD DIR:",
        frontend_build_dir if os.path.exists(frontend_build_dir) else None,
    )

    @app.route("/")
    def serve_react_index():
        index_path = os.path.join(frontend_build_dir, "index.html")

        if not os.path.exists(index_path):
            return "Frontend build not found. Run npm run build in frontend.", 404

        return send_from_directory(frontend_build_dir, "index.html")

    @app.route("/<path:path>")
    def serve_react_routes(path):
        if path.startswith("api/"):
            return {"error": "API route not found"}, 404

        requested_path = os.path.join(frontend_build_dir, path)

        if os.path.exists(requested_path) and os.path.isfile(requested_path):
            return send_from_directory(frontend_build_dir, path)

        index_path = os.path.join(frontend_build_dir, "index.html")

        if not os.path.exists(index_path):
            return "Frontend build not found. Run npm run build in frontend.", 404

        return send_from_directory(frontend_build_dir, "index.html")

    return app