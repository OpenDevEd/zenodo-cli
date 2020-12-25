import axios from 'axios';
import * as fs from "fs";
import opn from 'opn';

import {
  dumpJSON,
  in_es6,
  loadConfig,
  parseId,
  parseIds,
  showDepositionJSON,
  updateMetadata
} from "./helper";

async function publishDeposition(args, id) {
  id = parseId(id);
  const {zenodoAPIUrl, params} = loadConfig(args.config);
  const res = await axios.post(`${zenodoAPIUrl}/${id}/actions/publish`, {"params": params});
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
  const {zenodoAPIUrl, params} = loadConfig(args.config);
  console.log(`getting data`);
  id = parseId(id);
  let res = await axios.get(`${zenodoAPIUrl}/${id}`, {"params": params});
  if ((res.status !== 200)) {
    if ((res.status["status"] !== 404)) {
      console.log(`Error in getting data: ${res.data}`);
      process.exit(1);
    } else {
      console.log("Checking helper ID.");
      const listParams = params;
      listParams["q"] = ("conceptrecid:" + id);
      res = await axios.get(zenodoAPIUrl, {"params": listParams});
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
  const {zenodoAPIUrl, params} = loadConfig(args.config);
  const res = await axios.post(zenodoAPIUrl, {"json": {"metadata": metadata}, "params": params});
  if ((res.status !== 201)) {
    console.log(`Error in creating new record: ${res.data}`);
    process.exit(1);
  }
  return res.data;
}

async function editDeposit(args, dep_id) {
  const {zenodoAPIUrl, params} = loadConfig(args.config);
  const res = await axios.post(`${zenodoAPIUrl}/${parseId(dep_id)}/actions/edit`, {"params": params});
  if ((res.status !== 201)) {
    console.log(`Error in making record editable. ${res.data}`);
    process.exit(1);
  }
  return res.data;
}

async function updateRecord(args, dep_id, metadata) {
  console.log("\tUpdating record.");
  const {zenodoAPIUrl, params} = loadConfig(args.config);
  const res = await axios.put(`${zenodoAPIUrl}/${parseId(dep_id)}`, {"json": {"metadata": metadata}, "params": params});
  if ((res.status !== 200)) {
    console.log(`Error in updating record. ${res.data}`);
    process.exit(1);
  }
  return res.data;
}

async function fileUpload(args, bucket_url, journal_filepath) {
  const {params} = loadConfig(args.config);
  console.log("\tUploading file.");
  const replaced = journal_filepath.replace("^.*\\/", "");
  const data = fs.readFileSync(journal_filepath, "utf8");
  const res = await axios.put(((bucket_url + "/") + replaced), {"data": data, "params": params});
  if ((res.status !== 200)) {
    process.exit(res.data);
  }
  console.log("\tUpload successful.");
}

async function finalActions(args, id, deposit_url) {
  if ((in_es6("publish", args) && args.publish)) {
    await publishDeposition(args, id);
  }
  if ((in_es6("show", args) && args.show)) {
    await showDeposition(args, id);
  }
  if ((in_es6("dump", args) && args.dump)) {
    await dumpDeposition(args, id);
  }
  if ((in_es6("open", args) && args.open)) {
    //webbrowser.open_new_tab(deposit_url);
    opn(deposit_url);
  }
}

export async function saveIdsToJson(args) {
  let data, f, ids;
  ids = parseIds(args.id);
  for (let id, _pj_c = 0, _pj_a = ids, _pj_b = _pj_a.length; (_pj_c < _pj_b); _pj_c += 1) {
    id = _pj_a[_pj_c];
    data = await getData(args, id);
    f = fs.writeFileSync(`${id}.json`, data["metadata"], {encoding: 'utf8'});
    f.close();
    await finalActions(args, id, data["links"]["html"]);
  }
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
    for (var filePath, _pj_c = 0, _pj_a = args.files, _pj_b = _pj_a.length; (_pj_c < _pj_b); _pj_c += 1) {
      filePath = _pj_a[_pj_c];
      await fileUpload(args, bucket_url, filePath);
    }
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
    for (var filePath, _pj_c = 0, _pj_a = args.files, _pj_b = _pj_a.length; (_pj_c < _pj_b); _pj_c += 1) {
      filePath = _pj_a[_pj_c];
      await fileUpload(args, bucket_url, filePath);
    }
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
    for (var filePath, _pj_c = 0, _pj_a = args.files, _pj_b = _pj_a.length; (_pj_c < _pj_b); _pj_c += 1) {
      filePath = _pj_a[_pj_c];
      await fileUpload(args, bucket_url, filePath);
    }
  }
  await finalActions(args, id, deposit_url);
}

export async function copy(args) {
  var bucket_url, metadata, response_data;
  metadata = getMetadata(args, args.id);
  delete metadata["doi"];
  delete metadata["prereserve_doi"];
  for (var journal_filepath, _pj_c = 0, _pj_a = args.files, _pj_b = _pj_a.length; (_pj_c < _pj_b); _pj_c += 1) {
    journal_filepath = _pj_a[_pj_c];
    console.log(("Processing: " + journal_filepath));
    response_data = await createRecord(args, metadata);
    bucket_url = response_data["links"]["bucket"];
    await fileUpload(args, bucket_url, journal_filepath);
    await finalActions(args, response_data["id"], response_data["links"]["html"]);
  }
}

export async function listDepositions(args) {
  const {zenodoAPIUrl, params} = loadConfig(args.config);
  params["page"] = args.page;
  params["size"] = (args.size ? args.size : 1000);
  const res = await axios.get(zenodoAPIUrl, {params});
  if ((res.status !== 200)) {
    console.log(`Failed in listDepositions: ${res.data}`);
    process.exit(1);
  }
  if ((in_es6("dump", args) && args.dump)) {
    dumpJSON(res.data);
  }
  for (var dep, _pj_c = 0, _pj_a = res.data, _pj_b = _pj_a.length; (_pj_c < _pj_b); _pj_c += 1) {
    dep = _pj_a[_pj_c];
    console.log(dep["record_id"], dep["conceptrecid"]);
    if ((in_es6("publish", args) && args.publish)) {
      await publishDeposition(args, dep["id"]);
    }
    if ((in_es6("show", args) && args.show)) {
      showDepositionJSON(dep);
    }
    if ((in_es6("open", args) && args.open)) {
      opn(dep["links"]["html"]);
    }
  }
}

export async function newVersion(args) {
  const {zenodoAPIUrl, params} = loadConfig(args.config);
  const id = parseId(args.id[0]);
  const response = await axios.post(`${zenodoAPIUrl}/${id}/actions/newversion`, {"params": params});
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
    for (var filePath, _pj_c = 0, _pj_a = args.files, _pj_b = _pj_a.length; (_pj_c < _pj_b); _pj_c += 1) {
      filePath = _pj_a[_pj_c];
      await fileUpload(args, bucket_url, filePath);
    }
  }
  await finalActions(args, response_data["id"], deposit_url);
  console.log("latest_draft: ", response_data["links"]["latest_draft"]);
}

export async function download(args) {
  var data, fp, id, name;
  id = parseId(args.id[0]);
  data = await getData(args, id);
  const {params} = loadConfig(args.config);
  for (var fileObj, _pj_c = 0, _pj_a = data["files"], _pj_b = _pj_a.length; (_pj_c < _pj_b); _pj_c += 1) {
    fileObj = _pj_a[_pj_c];
    name = fileObj["filename"];
    console.log(`Downloading ${name}`);
    const res = await axios.get(fileObj["links"]["download"], {"params": params});
    fp = open(name, "wb+");
    fp.write(res.data);
    fp.close();
    fp = open((name + ".md5"), "w+");
    fp.write(((fileObj["checksum"] + " ") + fileObj["filename"]));
    fp.close();
  }
}

export async function concept(args) {
  const {zenodoAPIUrl, params} = loadConfig(args.config);
  params["q"] = `conceptrecid:${parseId(args.id[0])}`;
  const res = await axios.get(zenodoAPIUrl, {"params": params});
  if ((res.status !== 200)) {
    console.log(`Failed in concept(args): `, res.data);
    process.exit(1);
  }
  if ((in_es6("dump", args) && args.dump)) {
    dumpJSON(res.data);
  }
  for (var dep, _pj_c = 0, _pj_a = res.data, _pj_b = _pj_a.length; (_pj_c < _pj_b); _pj_c += 1) {
    dep = _pj_a[_pj_c];
    console.log(dep["record_id"], dep["conceptrecid"]);
    if ((in_es6("publish", args) && args.publish)) {
      await publishDeposition(args, dep["id"]);
    }
    if ((in_es6("show", args) && args.show)) {
      showDepositionJSON(dep);
    }
    if ((in_es6("open", args) && args.open)) {
      opn(dep["links"]["html"]);
    }
  }
}


export async function create(args) {
  const f = fs.readFileSync("blank.json", {encoding: 'utf8'});
  const metadata = updateMetadata(args, JSON.parse(f));
  const response_data = await createRecord(args, metadata);
  await finalActions(args, response_data["id"], response_data["links"]["html"]);
}
