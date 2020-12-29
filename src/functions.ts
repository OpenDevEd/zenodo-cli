import axios from 'axios';
import * as fs from "fs";
import opn from 'opn';


import {
  dumpJSON,
  loadConfig,
  parseId,
  parseIds,
  showDepositionJSON,
  updateMetadata
} from "./helper";

async function publishDeposition(args, id) {
  id = parseId(id);
  const { zenodoAPIUrl, params } = loadConfig(args.config);
  const res = await axios.post(`${zenodoAPIUrl}/${id}/actions/publish`, { "params": params });
  if ((res.data !== 202)) {
    console.log(`Error in publshing deposition ${id}: `, res.data);
  } else {
    console.log(`\tDeposition ${id} successfully published.`);
  }
}

async function showDeposition(args, id) {
  const info = await getData(args, parseId(id));
  showDepositionJSON(info);
}

async function getData(args, id) {
  const { zenodoAPIUrl, params } = loadConfig(args.config);
  console.log(`getting data`);
  id = parseId(id);
  let res = await axios.get(`${zenodoAPIUrl}/${id}`, { "params": params });
  if ((res.status !== 200)) {
    if ((res.status["status"] !== 404)) {
      console.log(`Error in getting data: ${res.data}`);
      process.exit(1);
    } else {
      console.log("Checking helper ID.");
      const listParams = params;
      listParams["q"] = ("conceptrecid:" + id);
      res = await axios.get(zenodoAPIUrl, { "params": listParams });
      if ((res.status !== 200)) {
        console.log(`Failed in getting data: ${res.data}`);
      } else {
        console.log(("Found record ID: " + res.data[0]["id"].toString()));
        return res.data[0];
      }
    }
  } else {
    return res.data;
  }
}

async function getMetadata(args, id) {
  return getData(args, id)["metadata"];
}

async function createRecord(args, metadata) {
  console.log("\tCreating record.");
  const { zenodoAPIUrl, params } = loadConfig(args.config);
  //console.log(`URI:    ${zenodoAPIUrl}`)
  //const zenodoAPIUrlWithToken = zenodoAPIUrl+"?access_token="+params["access_token"]

  // At present, the file blank.json is used as a default, therefore the checks below will pass.
  // However, blank.json does not contain a date - Zenodo will use todays date
  /* const requiredMetadataFields = ["title", "description", "authors"]
  var raiseErrorMissingMetadata = false
  requiredMetadataFields.forEach(metadatafield => {
    if (!(metadatafield in metadata)) {
      console.log(`To create a new record, you need to supply the ${metadatafield}.`);
      raiseErrorMissingMetadata = true
    } else {
      console.log(`Go to ${metadatafield} = ${metadata[metadatafield]}`)
    }
  });
  if (raiseErrorMissingMetadata) {
    console.log("One or more required fields are missing. Please consult 'create -h'.")
    process.exit(1)
  } */
  const payload = {"metadata" : metadata}
  console.log(JSON.stringify(payload))
  const options = { headers: {'Content-Type': "application/json"}, params: params }
  const res = await axios.post(zenodoAPIUrl, JSON.stringify(payload), options )
  .catch(function (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.log(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error', error.message);
    }
    console.log(error.config);
    console.log(`Fatal error in create->axios.post: ${error}`);
    process.exit(1);  
  });
  if ((res.status !== 201)) {
    console.log(`Error in creating new record (other than 201): ${res.data}`);
    console.log("List of error codes: https://developers.zenodo.org/?shell#http-status-codes");
    console.log("Response was: " + JSON.stringify(res))
    process.exit(1);
  } else {
    // Success: res.status == 201
    return res.data;
  }
} 


async function editDeposit(args, dep_id) {
  const { zenodoAPIUrl, params } = loadConfig(args.config);
  const res = await axios.post(`${zenodoAPIUrl}/${parseId(dep_id)}/actions/edit`, { "params": params });
  if ((res.status !== 201)) {
    console.log(`Error in making record editable. ${res.data}`);
    process.exit(1);
  }
  return res.data;
}

async function updateRecord(args, dep_id, metadata) {
  console.log("\tUpdating record.");
  const { zenodoAPIUrl, params } = loadConfig(args.config);
  const res = await axios.put(`${zenodoAPIUrl}/${parseId(dep_id)}`, { "json": { "metadata": metadata }, "params": params });
  if ((res.status !== 200)) {
    console.log(`Error in updating record. ${res.data}`);
    process.exit(1);
  }
  return res.data;
}

async function fileUpload(args, bucket_url, journal_filepath) {
  const { params } = loadConfig(args.config);
  console.log("\tUploading file.");
  const replaced = journal_filepath.replace("^.*\\/", "");
  const data = fs.readFileSync(journal_filepath, "utf8");
  const res = await axios.put(((bucket_url + "/") + replaced), { "data": data, "params": params });
  if ((res.status !== 200)) {
    process.exit(res.data);
  }
  console.log("\tUpload successful.");
}

async function finalActions(args, id, deposit_url) {
  console.log("final actions")
  if (("publish" in args) && args.publish) {
    await publishDeposition(args, id);
  }
  if (("show" in args) && args.show) {
    await showDeposition(args, id);
  }
  if (("dump" in args) && args.dump) {
    await dumpDeposition(args, id);
  }
  if (("open" in args) && args.open) {
    //webbrowser.open_new_tab(deposit_url);
    opn(deposit_url);
  }
}

export async function saveIdsToJson(args) {
  let data, ids;
  ids = parseIds(args.id);
  ids.forEach(async function (id) {
    data = await getData(args, id);
    let path = `${id}.json`;
    let buffer = Buffer.from(JSON.stringify(data["metadata"]));
    fs.open(path, 'w', function (err, fd) {
      if (err) {
        throw 'could not open file: ' + err;
      }
      // write the contents of the buffer, from position 0 to the end, to the file descriptor returned in opening our file
      fs.write(fd, buffer, 0, buffer.length, null, function (err) {
        if (err) throw 'error writing file: ' + err;
        fs.close(fd, function () {
          console.log('wrote the file successfully');
        });
      });
    });
    await finalActions(args, id, data["links"]["html"]);
  })
}

export async function dumpDeposition(args, id) {
  const info = await getData(args, parseId(id));
  dumpJSON(info);
}

export async function duplicate(args) {
  var bucket_url, deposit_url, metadata, response_data;
  metadata = getMetadata(args, args.id[0]);
  delete metadata["doi"];
  metadata["prereserve_doi"] = true;
  metadata = updateMetadata(args, metadata);
  response_data = createRecord(args, metadata);
  bucket_url = response_data["links"]["bucket"];
  deposit_url = response_data["links"]["html"];
  if (args.files) {
    args.files.forEach(async function (filePath) {
      await fileUpload(args, bucket_url, filePath);
    })
  }
  await finalActions(args, response_data["id"], deposit_url);
}

export async function upload(args) {
  var bucket_url, deposit_url, response;
  bucket_url = null;
  if (args.bucketurl) {
    bucket_url = args.bucketurl;
  } else {
    if (args.id) {
      response = getData(args, args.id);
      bucket_url = response["links"]["bucket"];
      deposit_url = response["links"]["html"];
    }
  }
  if (bucket_url) {
    args.files.forEach(async function (filePath) {
      await fileUpload(args, bucket_url, filePath);
    })
    await finalActions(args, args.id, deposit_url);
  } else {
    console.log("Unable to upload: id and bucketurl both not specified.");
  }
}

export async function update(args) {
  var bucket_url, data, deposit_url, id, metadata, response_data;
  id = parseId(args.id[0]);
  data = getData(args, id);
  metadata = data["metadata"];
  if ((data["state"] === "done")) {
    console.log("\tMaking record editable.");
    response_data = editDeposit(args, id);
  } else {
    metadata = updateMetadata(args, metadata);
    response_data = updateRecord(args, id, metadata);
  }
  bucket_url = response_data["links"]["bucket"];
  deposit_url = response_data["links"]["html"];
  if (args.files) {
    args.files.forEach(async function (filePath) {
      await fileUpload(args, bucket_url, filePath);
    })
  }
  await finalActions(args, id, deposit_url);
}

export async function copy(args) {
  var bucket_url, metadata, response_data;
  metadata = getMetadata(args, args.id);
  delete metadata["doi"];
  delete metadata["prereserve_doi"];
  var arr = args.files
  arr.forEach(async function (journal_filepath) {
    console.log(("Processing: " + journal_filepath));
    response_data = await createRecord(args, metadata);
    bucket_url = response_data["links"]["bucket"];
    await fileUpload(args, bucket_url, journal_filepath);
    await finalActions(args, response_data["id"], response_data["links"]["html"]);
  });
}

export async function listDepositions(args) {
  const { zenodoAPIUrl, params } = loadConfig(args.config);
  params["page"] = args.page;
  params["size"] = (args.size ? args.size : 1000);
  const res = await axios.get(zenodoAPIUrl, { params });
  if ((res.status !== 200)) {
    console.log(`Failed in listDepositions: ${res.data}`);
    process.exit(1);
  }
  if ("dump" in args && args.dump) {
    dumpJSON(res.data);
  }
  if ("publish" in args && args.publish) {
    console.log("Warning: using 'list' with '--publish' means that all of your depositions will be published. Please confirm by typing yes.");
    // TODO
    // Capture user input. If yser types yes, continue. If user types anything else, then abort.  
    /* 
    var stdin = process.openStdin();
    stdin.addListener("data", function(d) {
      // note:  d is an object, and when converted to a string it will
      // end with a linefeed.  so we (rather crudely) account for that  
      // with toString() and then substring() 
      console.log("you entered: [" + d.toString().trim() + "]");
    }); 
    */
  }
  var arr = res.data
  arr.forEach(async function (dep) {
    console.log(dep["record_id"], dep["conceptrecid"]);
    await finalActions(args, dep["id"], dep["links"]["html"]);
  });
}

export async function newVersion(args) {
  const { zenodoAPIUrl, params } = loadConfig(args.config);
  const id = parseId(args.id[0]);
  const response = await axios.post(`${zenodoAPIUrl}/${id}/actions/newversion`, { "params": params });
  if ((response.status !== 201)) {
    console.log(`New version request failed:`, response.data);
    process.exit(1);
  }
  let response_data = response.data;
  const metadata = await getMetadata(args, id);
  const newmetadata = updateMetadata(args, metadata);
  if ((newmetadata !== metadata)) {
    response_data = updateRecord(args, id, newmetadata);
  }
  const bucket_url = response_data["links"]["bucket"];
  const deposit_url = response_data["links"]["latest_html"];
  if (args.files) {
    args.files.forEach(async function (filePath) {
      await fileUpload(args, bucket_url, filePath);
    })
  }
  await finalActions(args, response_data["id"], deposit_url);
  console.log("latest_draft: ", response_data["links"]["latest_draft"]);
}

export async function download(args) {
  var data, fp, id, name;
  id = parseId(args.id[0]);
  data = await getData(args, id);
  const { params } = loadConfig(args.config);
  data["files"].forEach(async function (fileObj) {
    name = fileObj["filename"];
    console.log(`Downloading ${name}`);
    const res = await axios.get(fileObj["links"]["download"], { "params": params });
    fp = open(name, "wb+");
    fp.write(res.data);
    fp.close();
    fp = open((name + ".md5"), "w+");
    fp.write(((fileObj["checksum"] + " ") + fileObj["filename"]));
    fp.close();
  })
}

export async function concept(args) {
  const { zenodoAPIUrl, params } = loadConfig(args.config);
  params["q"] = `conceptrecid:${parseId(args.id[0])}`;
  const res = await axios.get(zenodoAPIUrl, { "params": params });
  if ((res.status !== 200)) {
    console.log(`Failed in concept(args): `, res.data);
    process.exit(1);
  }
  if ("dump" in args && args.dump) {
    dumpJSON(res.data);
  }
  res.data.forEach(async function (dep) {
    console.log(dep["record_id"], dep["conceptrecid"]);
    // TODO replace what's below with finalactions.
    if ("publish" in args && args.publish) {
      await publishDeposition(args, dep["id"]);
    }
    if ("show" in args && args.show) {
      showDepositionJSON(dep);
    }
    if ("open" in args && args.open) {
      opn(dep["links"]["html"]);
    }
  })
}


export async function create(args) {
  const blankJson = `{
    "access_right": "open",
    "creators": [
      {
          "name": "(name)",
          "affiliation": "(affiliation)"
      }
    ],
    "title": "No title available.",
    "description": "No description available",
    "communities": [
      {
        "identifier": "zenodo"
      }
    ],
    "doi": "",
    "publication_type": "report",
    "upload_type": "publication"
  }
  `;
  //const f = fs.readFileSync("blank.json", { encoding: 'utf8' });
  const metadata = updateMetadata(args, JSON.parse(blankJson));
  const response_data = await createRecord(args, metadata);
  console.log(response_data)
  if (response_data) {
    await finalActions(args, response_data["id"], response_data["links"]["html"]);
  } else {
    console.log("Record creation failed.")
  }
}
