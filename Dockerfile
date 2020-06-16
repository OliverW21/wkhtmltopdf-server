FROM node:12.16.2

ENV WKHTMLTOPDF_VERSION 0.12.5
ENV NODE_ENV production

RUN apt-get -qq update && \
    apt-get -qq -y install wget xfonts-75dpi xfonts-base libpng16-16 ibssl1.1 && \
    npm install -g forever && \
    apt-get clean

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
