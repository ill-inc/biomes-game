# This file describes the development environment for Biomes.
FROM ubuntu:22.04

LABEL description="Linux development environment for building biomes."

# Install some basic development tools.
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update --fix-missing && apt-get -y install \
  curl \
  perl \
  sudo \
  locales \
  bzip2 \
  bash \
  xz-utils \
  htop \
  git \
  git-lfs \
  wget \
  vim \
  man \
  pkg-config \
  yasm \
  gnupg \
  make \
  cmake \
  clang \
  clangd \
  python-is-python3 \
  pip \
  binutils \
  gdb \
  g++ \
  clang-tidy \
  clang-format \
  apt-transport-https \
  build-essential \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  # To enable SSH access to remote workspaces (e.g. codespaces).
  openssh-server \
  # For software EGL/GLES2.
  libgles2-mesa-dev \
  rsync \
  ca-certificates \  # Add CA certificates package
  && apt-get clean && apt-get purge && apt-get autoremove --purge -y

# Ensure CA certificates are up to date
RUN update-ca-certificates

# Configure Git to use the CA certificates
RUN git config --global http.sslCAInfo /etc/ssl/certs/ca-certificates.crt

# Setup our locale.
RUN echo "en_US.UTF-8 UTF-8" > /etc/locale.gen
RUN locale-gen en_US.UTF-8
ENV LANG en_US.UTF-8

# Prepare to create a non-root user for the container work, since node doesn't
# like it when it's run as root.
ARG DOCKER_USER_NAME=docker-user
ARG DOCKER_USER_UID=1000
ARG DOCKER_USER_GID=${DOCKER_USER_UID}

# Create the user
RUN groupadd --gid ${DOCKER_USER_GID} ${DOCKER_USER_NAME} \
  && useradd --uid ${DOCKER_USER_UID} --gid ${DOCKER_USER_GID} -m ${DOCKER_USER_NAME} \
  && echo ${DOCKER_USER_NAME} ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/${DOCKER_USER_NAME} \
  && chmod 0440 /etc/sudoers.d/${DOCKER_USER_NAME}

# Set the default user to something other than root, node doesn't like being
# run as root.
USER ${DOCKER_USER_NAME}
ENV HOME /home/${DOCKER_USER_NAME}

# Create this in advance as "docker-user" so that it doesn't instead get created
# as root.
RUN mkdir -p ${HOME}/.vscode-server/extensions

# Install nvm.
ENV NVM_DIR ${HOME}/.nvm
ENV NODE_VERSION 20.0.0

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash \
  && . "$NVM_DIR/nvm.sh"  \
  && nvm install ${NODE_VERSION} \
  && nvm alias default ${NODE_VERSION} \
  && nvm use default

ENV PATH ${NVM_DIR}/versions/node/v${NODE_VERSION}/bin:$PATH

# Remember our console history between sessions.
ENV COMMAND_HISTORY_DIR ${HOME}/commandhistory
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=${COMMAND_HISTORY_DIR}/.bash_history" \
  && mkdir -p ${COMMAND_HISTORY_DIR} \
  && echo $SNIPPET >> "${HOME}/.bashrc"
