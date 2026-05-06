from flask import Flask
from flask_cors import CORS
from .extensions import db, migrate, jwt
from .models import *
from .routes import api
import os


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
                ]
            }
        },
    )

    database_url = os.getenv("DATABASE_URL", "sqlite:///app.db")

    # Some hosts provide postgres://, but SQLAlchemy expects postgresql://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv(
        "JWT_SECRET_KEY",
        "dev-only-change-me-please-make-this-longer"
    )


    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    app.register_blueprint(api, url_prefix="/api")

    return app
