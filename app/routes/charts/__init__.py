from flask import Blueprint

# This blueprint will handle all chart-related routes
charts = Blueprint("charts", __name__)

# Import routes here to register with the blueprint
from . import home_charts_routes, class_charts_routes, assignment_charts_routes
