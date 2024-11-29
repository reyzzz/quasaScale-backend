# QuasaScale Backend (Headscale API on steroids)

## Overview

The **QuasaScale Backend** is a powerful extension for [Headscale](https://github.com/juanfont/headscale), designed to enhance its functionality by providing additional APIs to simplify and extend its capabilities. This project is built using **Bun**, **Hono**, and **TypeScript**, offering a robust, modern, and efficient backend system for Headscale.

If you're looking for an advanced, feature-rich, and high-performance API extension for your Headscale setup, **QuasaScale Backend** is exactly what you need.
Actually it is meant to be used with its frontend [QuasaScale ](https://github.com/reyzzz/quasaScale)

## Getting Started

### Prerequisites

To run the QuasaScale Backend, you'll need:

- **Bun**: You can install Bun by following the official guide at [bun.sh](https://bun.sh/).
- **Headscale**: You must have a working Headscale setup with version 0.23.0 (it is not compatible with older versions), as QuasaScale Backend extends its API.
### Installation

1. Download and unzip quasascale-backend

   ```bash
   mkdir quasascale-backend
   wget https://github.com/reyzzz/quasaScale-backend/releases/download/v0.23.0-beta.2/quasascale-backend.zip
   unzip quasascale-backend.zip
   rm quasascale-backend.zip
   ```

1. Adjust .env file
   - HEADSCALE_TOKEN is the token that you will generate using headscale

      ```bash
      headscale apikeys create -e 999d
      ```
   - HEADSCALE_CONFIG_PATH is the path of headscale config.yaml file
   - HEADSCALE_SQLITE_PATH is the path of headscale db.sqlite database file
   - HEADSCALE_ACL_PATH is the path of headscale acl.hujson file
   - QUASASCALE_URL is a comma separated quasascale (frontend) urls of the origin that should be allowed by CORS
   - HEADSCALE_API_URL the localhost url of headscale
   - DOCKER if headscale is running in docker
   - HEADSCALE_SERVICE the name of the systemd service
   - CONTAINER_NAME the name of headscale docker container
   - PORT the port number of quasaScale backend service, default to 3000

1. Run in production as system service
   - Use the provided quasascale-backend.service and edit the WorkingDirectory, then
   
   ```bash
   cp ./quasascale-backend.service /lib/systemd/system/quasascale-backend.service
   systemctl enable quasascale-backend
   systemctl start quasascale-backend
   ```
