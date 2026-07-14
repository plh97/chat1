.PHONY: backend-go-dev
backend-go-dev:
	$(MAKE) -C packages/backend-go dev

.PHONY: backend-go-bootstrap
backend-go-bootstrap:
	$(MAKE) -C packages/backend-go bootstrap

.PHONY: backend-go-migrate-reset
backend-go-migrate-reset:
	$(MAKE) -C packages/backend-go migrate-reset
