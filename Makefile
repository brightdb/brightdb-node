docker:
	npm run babel
	-docker rm -f brightdb-node
	docker-compose up -d
