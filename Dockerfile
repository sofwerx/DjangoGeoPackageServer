FROM ubuntu:16.04

RUN apt-get update
RUN apt-get install -y python-pip

RUN mkdir -p /app/GPKGServer/
ADD requirements.txt /app/GPKGServer/

WORKDIR /app/GPKGServer

RUN pip install -r requirements.txt

ADD . /app

WORKDIR /app/GPKGServer

EXPOSE 7999

CMD bash -xc './updateDB.sh && exec ./runserver.sh'

