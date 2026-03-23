from flask import Flask
from .extensions import db, migrate
from .models import *  # ensures models are registered


def create_app():
    app = Flask(__name__)

    app.config.from_object("config.Config")

    db.init_app(app)
    migrate.init_app(app, db)

    return app