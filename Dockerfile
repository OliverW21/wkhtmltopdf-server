FROM node:12.16.2

ENV DEBIAN_FRONTEND noninteractive
ENV DEBIAN_PRIORITY critical
ENV DEBCONF_NOWARNINGS yes
ENV WKHTMLTOPDF_VERSION 0.12.5
ENV NODE_ENV production

RUN apt-get -qq update && \
    apt-get -q -y install ^fonts-* xfonts-75dpi xfonts-base \
    wget libpng16-16 ibssl1.1 && \
    npm install -g forever

RUN echo "deb http://deb.debian.org/debian stretch contrib non-free" | tee -a /etc/apt/sources.list && \
    echo "deb http://deb.debian.org/debian-security stretch/updates contrib non-free" | tee -a /etc/apt/sources.list && \
    apt-get -qq update && \
    apt-get -q -y install ttf-mscorefonts-installer && \
    apt-get clean && \
    fc-cache -rv


RUN wget https://github.com/wkhtmltopdf/wkhtmltopdf/releases/download/0.12.5/wkhtmltox_0.12.5-1.stretch_amd64.deb && \
    dpkg -i wkhtmltox* && \
    rm wkhtmltox* && \
    apt-get clean

RUN mkdir /app && \
    mkdir /var/log/pdf-generator && \
    mkdir /app/output

WORKDIR /app

COPY ./ /app

RUN npm install

EXPOSE 5580

CMD ["npm", "start", "--prefix", "/app"]
