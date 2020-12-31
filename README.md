# Zenodo Commandline Interface

Install the Zenodo commandline interface with
```
npm install -g zenodo-cli
```
You can then use `zenodo-cli` at the commandline as follows
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
