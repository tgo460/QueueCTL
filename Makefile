install:
	npm install

test:
	bash scripts/test_flow.sh

lint:
	# No linter configured yet

.PHONY: install test lint
