.PHONY: install lint test up down smoke build k8s-validate

install:
	cd services/gateway && npm install
	cd services/order && npm install
	cd services/product && pip install -r requirements.txt -r requirements-dev.txt

lint:
	cd services/gateway && npm run lint
	cd services/order && npm run lint
	cd services/product && flake8 .

test:
	cd services/gateway && npm test
	cd services/order && npm test
	cd services/product && python -m pytest -q

build:
	docker compose build

up:
	docker compose up -d --build

down:
	docker compose down -v

smoke:
	./scripts/smoke-test.sh http://localhost:8080

k8s-validate:
	kubectl kustomize k8s/overlays/staging >/dev/null
	kubectl kustomize k8s/overlays/prod >/dev/null
