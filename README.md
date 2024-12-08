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
   cd quasascale-backend
   wget https://github.com/reyzzz/quasaScale-backend/releases/latest/download/quasascale-backend.zip
   unzip quasascale-backend.zip
   rm quasascale-backend.zip
   ```

1. Adjust .env file
   - HEADSCALE_API_KEY is the api key that you generate using headscale

      ```bash
      headscale apikeys create -e 999d
      ```
   - HEADSCALE_CONFIG_PATH is the path of headscale config.yaml file
   - HEADSCALE_SQLITE_PATH is the path of headscale db.sqlite database file
   - HEADSCALE_ACL_PATH is the path of headscale acl.hujson file
   - HEADSCALE_API_URL the localhost url of headscale
   - HEADSCALE_INTEGRATION docker or systemd depending if headscale is running in docker or as a system service
   - HEADSCALE_NAME is the name of the headscale systemd service or the headscale docker container
   - QUASASCALE_PORT the port number of quasaScale backend service, default 3000
   - QUASASCALE_FRONTEND_URLS is a comma separated quasaScale (frontend) urls of the origin that should be allowed by CORS

1. Run in production as system service
   - Use the provided quasascale-backend.service and edit the WorkingDirectory, then

   ```bash
   cp ./quasascale-backend.service /lib/systemd/system/quasascale-backend.service
   systemctl enable quasascale-backend
   systemctl start quasascale-backend
   ```
2. Integrations that are supported:
   | Headscale | QuasaScale Backend | Supported |
   | :-------: | :----:| :------: |
   | docker | docker | ✅ |
   | docker | systemd | ✅ |
   | systemd | systemd | ✅ |
   | systemd | docker | ❌ |

