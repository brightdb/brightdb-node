# BrightDB Node

Add a directory `proxy/certs` and put a certificate and private key file in there. File names and hostname in `VIRTUAL_HOST` environment variable must match. Run with:

    npm run babel
    docker-compose up -d
