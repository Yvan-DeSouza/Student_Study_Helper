from flask import Blueprint

preferences = Blueprint("preferences", __name__)

from .class_preferences import *
from .assignment_preferences import *
from .column_preferences import *
