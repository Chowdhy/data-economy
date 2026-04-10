from flask import Flask
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

    return app
