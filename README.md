# Django Geopackage Server

## What is this?

This repository holds code for geopackage viewing. It is also a testing ground for the geopackage relation extension for the javascript library.

## Setup

The prerequisites for this repository are python2, virtualenv, and an updated pip client.

Git clone the repository in a desired directory and change to the project's directory.

Make a virtualenv with python2 for the project; if you choose to make it in the git repository, name it 'env'.

Creating the Environment (linux): `virtual -p python2 <env_name>`

Start the Environment  (linux): `source <env_name>/bin/activate`

Next you can pip install your dependences: `pip install -r requirements.txt`

Go to GPKGServer: `cd GPKGServer`

You can change the settings of the project (namely, database settings) in `GPKGServer/settings.py`.

Run updateDB to initialize the database Models: `./updateDB.sh`

You can now run the server with the following command: `./runserver.sh`

This will run a server on [0.0.0.0:7999](http://127.0.0.1:7999/)

## Usage

In the current stage of the application, an administration account is not needed.

You can go to the base site and upload a GeoPackage. You can also click on a geopackage that has been uploaded previously.

When doing so, this will open the "Editing" panel. It'll show you the list of current tables and their control interfaces.

You can toggle a layer with the checkbox, zoom to a layer using the magnifying glass, and edit (coming soon) and view the 
metadata of a layer using the respective buttons.

Clicking on a feature of a map will give you options regarding the point. Right now, the only option is to view the relations 
of that point.

