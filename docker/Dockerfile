FROM node:latest

# Copy source to container
RUN mkdir -p /usr/app/src
RUN mkdir -p /etc/nibepi
RUN chown -R node:node /usr/app
RUN chown -R node:node /etc/nibepi

COPY nibepi/package*.json /usr/app/src
WORKDIR /usr/app
USER node
RUN cd src && npm install -only=production
USER root
RUN apt-get remove --purge -y \
bzr \
git \
mercurial \
openssh-client \
subversion \
autoconf \
automake \
bzip2 \
dpkg-dev \
file \
g++ \
imagemagick \
libbz2-dev \
libc6-dev \
libcurl4-openssl-dev \
libdb-dev \
libevent-dev \
libffi-dev \
libgdbm-dev \
libglib2.0-dev \
libgmp-dev \
libjpeg-dev \
libkrb5-dev \
liblzma-dev \
libmagickcore-dev \
libmagickwand-dev \
libncurses5-dev \
libncursesw5-dev \
libpng-dev \
libpq-dev \
libreadline-dev \
libsqlite3-dev \
libssl-dev \
libtool \
libwebp-dev \
libxml2-dev \
libxslt-dev \
libyaml-dev \
make \
patch \
unzip \
xz-utils \
zlib1g-dev && \
rm -rf /var/lib/apt/lists/*
USER node
COPY nibepi /usr/app/src

CMD [ "node", "./src/server.js" ]
