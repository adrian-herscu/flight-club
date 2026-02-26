.PHONY: test lint build migrate seed format

BACKEND_DIR=backend
FRONTEND_DIR=frontend

setup-backend:
	cd $(BACKEND_DIR) && python -m pip install -r requirements.txt && python -m pip install -r requirements-dev.txt

setup-frontend:
	cd $(FRONTEND_DIR) && npm install

test:
	cd $(BACKEND_DIR) && pytest --cov=src --cov-report=term-missing

lint:
	cd $(BACKEND_DIR) && ruff check . && mypy .
	cd $(FRONTEND_DIR) && npm run lint

format:
	cd $(BACKEND_DIR) && ruff format .
	cd $(FRONTEND_DIR) && npm run format:write

build:
	cd $(FRONTEND_DIR) && npm run build

migrate:
	cd $(BACKEND_DIR) && alembic upgrade head

seed:
	cd $(BACKEND_DIR) && python -m src.services.seed
