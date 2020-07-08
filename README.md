# berlin-service-harvester
Harvesting the descriptions of digital services on berlin.de

## What is this?
This scrapes digital services from berlin.de and turns them into structured, machine-readable formats

## Install

```
npm install
```

## Configure

Edit the `services.json` file and add the urls of services that should be scraped, urls should be of the form `http....../483053084503` the number/string at the end is becoming the id of this services in the generated output file.

## Use

```
node index.js
```