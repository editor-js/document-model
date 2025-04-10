# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.9.0

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine AS base

# Set working directory for all build stages.
WORKDIR /usr/src/app/

RUN corepack enable
RUN corepack prepare yarn@4.0.1 --activate

################################################################################
# Create a stage for installing production dependecies.
FROM base AS deps

# Download dependencies as a separate step to take advantage of Docker's caching.
COPY .yarnrc.yml package.json yarn.lock ./
COPY .yarn .yarn
COPY packages/model/package.json packages/model/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/collaboration-manager/package.json packages/collaboration-manager/package.json
COPY packages/ot-server/package.json packages/ot-server/package.json

RUN yarn workspaces focus @editorjs/ot-server

################################################################################
# Create a stage for building the application.
FROM deps AS build


# Copy the rest of the source files into the image.
COPY packages/model packages/model
COPY packages/sdk packages/sdk
COPY packages/collaboration-manager packages/collaboration-manager
COPY packages/ot-server packages/ot-server

# Run the build script.
RUN yarn workspace @editorjs/ot-server build

################################################################################
# Create a new stage to run the application with minimal runtime dependencies
# where the necessary files are copied from the build stage.
FROM base AS final

ARG NODE_ENV=production
ARG WSS_PORT=8080

# Use production node environment by default.
ENV NODE_ENV $NODE_ENV
ENV WSS_PORT $WSS_PORT

COPY --from=build /usr/src/app/.yarn /usr/src/app/.yarn
COPY --from=build /usr/src/app/package.json /usr/src/app/.yarnrc.yml /usr/src/app/yarn.lock /usr/src/app/
COPY --from=build /usr/src/app/node_modules /usr/src/app/node_modules

COPY --from=build /usr/src/app/packages/model/dist /usr/src/app/packages/model/dist
COPY --from=build /usr/src/app/packages/model/package.json /usr/src/app/packages/model/package.json

COPY --from=build /usr/src/app/packages/sdk/dist /usr/src/app/packages/sdk/dist
COPY --from=build /usr/src/app/packages/sdk/package.json /usr/src/app/packages/sdk/package.json

COPY --from=build /usr/src/app/packages/collaboration-manager/dist /usr/src/app/packages/collaboration-manager/dist
COPY --from=build /usr/src/app/packages/collaboration-manager/package.json /usr/src/app/packages/collaboration-manager/package.json

COPY --from=build /usr/src/app/packages/ot-server/dist /usr/src/app/packages/ot-server/dist
COPY --from=build /usr/src/app/packages/ot-server/package.json /usr/src/app/packages/ot-server/package.json


# Run the application as a non-root user.
USER node

RUN find ./

# Expose the port that the application listens on.
EXPOSE $WSS_PORT

# Run the application.
CMD yarn workspace @editorjs/ot-server run start
