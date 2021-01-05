# zenodo-cli
## Introduction: Tools for working with the APIs of Zotero and Zenodo (zotzen)

This repository is part of a set of repositories, see here: https://github.com/orgs/OpenDevEd/teams/zotzen-team/repositories. Currently, this set contains a number of libraries
- zenodo-lib https://github.com/opendeved/zenodo-lib, https://www.npmjs.com/package/zenodo-lib
- zotero-lib https://github.com/opendeved/zotero-lib, https://www.npmjs.com/package/zotero-lib
- zotzen-lib https://github.com/opendeved/zotzen-lib, https://www.npmjs.com/package/zotzzen-lib

The set contains some command-line tools:
- zenodo-cli https://github.com/opendeved/zenodo-cli, https://www.npmjs.com/package/zenodo-cli
- zotero-cli  https://github.com/opendeved/zotero-cli, https://www.npmjs.com/package/zotero-cli
- zotzen-cli  https://github.com/opendeved/zotzen-cli, https://www.npmjs.com/package/zotzen-cli

And a web application
- zotzen-web https://github.com/opendeved/zotzen-web

# Zenodo Commandline Interface

Install the Zenodo commandline interface with
```
npm install -g zenodo-cli
```
See https://www.npmjs.com/package/zenodo-cli. You can then use `zenodo-cli` at the commandline as follows
```
zenodo-cli --help
```


# Information

A commandline tool to interact with the Zenodo API. Developed by @bjohas, Zeina and Sheraz.

The main script is zenodo-cli.

Versions:
This repo forms part of a set of repos:

- https://github.com/bjohas/zenodo-cli-ts
- https://github.com/edtechhub/zotzen
- https://github.com/edtechhub/zotero-cli

An earlier version (in python) is available here https://github.com/bjohas/zenodo-cli-python

# How Zenodo works

##  (1a) Record creation
  
  ```
  DOI: ......./.100100 <- concept
  DOI: ......./.100101 <- record
  ```
  - -> add metadata ("create")
  - -> add file ("upload")
  - https://doi.org/......./.100101 is not active
  - -> change metadata ("create")
  - -> add/remove file ("upload")
  - https://doi.org/......./.100101 is not active
  - -> add metadata ("create")
  - -> add file ("upload")
  - https://doi.org/......./.100101 is not active

```  
state: 'unsubmitted',
submitted: false,
```  
##  (1b) record publishing
  - -> now, https://doi.org/......./.100101 resolves (i.e., the DOI is active).
  - -> At this point, the record is no longer editable (metadata is locked; the file is locked).
  
  ```
    state: 'done',
    submitted: true,
```

## (2) Amending metadata only (without changing the deposited files)

 Now suppose, I want to edit the metadata: This is allowed without changing the DOI. 

 call "makeEditable" and edit the metadata.

 publish to make the new metadata live.

```  
  state: 'inprogress',
  submitted: true,
```

publish 

```
    state: 'done',
    submitted: true,
```


##  (3) Changing deposited files:

  Now, I want to change the record files. I cannot change the files for ......./.100101, because it has been submitted.

  If I now say, newVersion, Zenodo allocates:

```
  DOI: ......./.222202 <- record
  (Retain DOI: ......./.100100 <- concept)
```
We then have
```
    state: 'unsubmitted',
    submitted: false,
```
After publishing
```
    state: 'done',
    submitted: true,
```  

## Zenodo records have these three states:
Three states
- state: 'unsubmitted'/submitted: false,
- state: 'done'/submitted: true,
- state: 'inprogress'/submitted: true,


  
  Zenodo has the notion of records and concepts. Both of them have <ID>s, e.g. 1341000=concept, 1341001=record, 1341002=record, 1341003=concept, 1341004=record.
  
  The only thing that is certain is that a concept <ID> is always followed by a record <ID>.
  
  The problem is that "?q=conceptrecid:<ID>" gives an error for <ID>s that are records, while ?q=recid:<ID>" gives an error for <ID>s that are concepts.
  
  At the moment 'get' uses "?q=recid:<ID>", i.e., we get an error for <ID>s that are concepts. However, the user doesn't know whether <ID> is a record or a concept...
  
  To work around this, we need to make our query as follows:
  "?q=conceptrecid:<ID> OR recid:<ID>".
  
  This will always return some json. The user then needs to work out whether it's a concept or a record.
  