import * as fs from "fs";


const FALLBACK_CONFIG_FILE = (process.env.HOME + "/.config/zenodo-cli/config.json");

/*
export function in_es6(left, right) {
  if (((right instanceof Array) || ((typeof right) === "string"))) {
    return (right.indexOf(left) > (-1));
  } else {
    if (((right instanceof Map) || (right instanceof Set) || (right instanceof WeakMap) || (right instanceof WeakSet))) {
      return right.has(left);
    } else {
      return (left.indexOf(right) !== -1);
    }
  }
}
*/

export function loadConfig(configFile) {
  //console.log("load file checking ...")
    if (fs.statSync(FALLBACK_CONFIG_FILE).isFile()) {
      configFile = FALLBACK_CONFIG_FILE;
      
    } else {
      console.log(`Config file not present at config.json or ${FALLBACK_CONFIG_FILE}`);
      process.exit(1);
    }

  const content = fs.readFileSync(configFile, "utf8");
  const config = JSON.parse(content);

  const params = {"access_token": config["accessToken"]};

  let zenodoAPIUrl = "";
  if ((config["env"] === "sandbox")) {
    zenodoAPIUrl = "https://sandbox.zenodo.org/api/deposit/depositions";
  } else {
    zenodoAPIUrl = "https://zenodo.org/api/deposit/depositions";
  }
  return {params, zenodoAPIUrl}
}

export function parseId(id) {
  var dot_split, slash_split;
  if (!isNaN(id.toString())) {
    return id;
  }
  slash_split = id.toString().split("/").slice((-1))[0];
  if (!isNaN(slash_split)) {
    id = slash_split;
  } else {
    dot_split = id.toString().split(".").slice((-1))[0];
    if (!isNaN(dot_split)) {
      id = dot_split;
    }
  }
  return id;
}

export function showDepositionJSON(info) {
  console.log(`Title: ${info["title"]}`);
  if ("publication_date" in info["metadata"]) {
    console.log(`Date: ${info["metadata"]["publication_date"]}`);
  } else {
    console.log("Date: N/A");
  }
  console.log(`RecordId: ${info["id"]}`);
  if ("conceptrecid" in info) {
    console.log(`ConceptId: ${info["conceptrecid"]}`);
  } else {
    console.log("ConceptId: N/A");
  }
  console.log(`DOI: ${info["metadata"]["prereserve_doi"]["doi"]}`);
  console.log(`Published: ${info["submitted"] ? "yes" : "no"}`);
  console.log(`State: ${info["state"]}`);
  console.log(`URL: https://zenodo.org/${info["submitted"] ? "record" : "deposit"}/${info["id"]}`);
  if ("bucket" in info["links"]) {
    console.log(`BucketURL: ${info["links"]["bucket"]}`);
  } else {
    console.log("BucketURL: N/A");
  }
  console.log("\n");
}

export function dumpJSON(info) {
  console.log(info);
  console.log("\n");
}

export function parseIds(genericIds) {
  return function () {
    var _pj_a = [], _pj_b = genericIds;
    for (var _pj_c = 0, _pj_d = _pj_b.length; (_pj_c < _pj_d); _pj_c += 1) {
      var id = _pj_b[_pj_c];
      _pj_a.push(parseId(id));
    }
    return _pj_a;
  }
    .call(this);
}

export function updateMetadata(args, metadata) {
  console.log("updateMetadata here ...")
  let author_data_dict, author_data_fp, author_info, comm, creator, meta_file;
  author_data_dict = {};
  if (("json" in args && args.json)) {
    meta_file = open(args.json);
//for (key, value) in json.load(meta_file).items():
////metadata[key] = value
    let arr = JSON.stringify(meta_file).split('')
    console.log(arr);
    arr.forEach((key,value) => {
    metadata[key] = value;
   });

    meta_file.close();
  }
  if ("creators" in metadata) {
//TODO
    let auth_arr = [];
    let creators = metadata["creators"];
    creators.forEach(creator => {
        auth_arr.push(creator["name"]);
      });
    metadata["name"] = auth_arr.join(";");

  }

  if ( "title" in args && args.title) {
    metadata["title"] = args.title;
  }
  if (("date" in args && args.date)) {
    metadata["publication_date"] = args.date;
  }
  if (("description" in args && args.description)) {
    metadata["description"] = args.description;
  }
  if (("add_communites" in args && args.add_communites)) {

    let community_arr = [];
    let add_communites_arr = args.add_communities;
    add_communites_arr.forEach(community => {
        community_arr.push({"identifier": community});
      });
     
    metadata["communities"] = community_arr.join(";");
  }

  if (("remove_communities" in args && args.remove_communities)) {

    let communities_arr = [];
    let metadataCommunities = metadata["communities"];
   
    metadataCommunities.forEach(community => {
        if (!(community in args.remove_communities)) {
          communities_arr.push({"identifier": community});
        }              
      });
     
    metadata["communities"] = communities_arr.join(";");      
  }

  if (("communities" in args && args.communities)) {
    comm = open(args.communities);
    metadata["communities"] = function () {
    let  comm_arr = [], comm_data_arr = comm.read().splitlines();   
    comm_data_arr.forEach(community => {
          comm_arr.push({"identifier": community});
          return comm_arr;
        });
    }
    .call(this);
    comm.close();
  }
  if (("authordata" in args && args.authordata)) {
    author_data_fp = open(args.authordata);
    let autherReadData = author_data_fp.read().splitlines()
    autherReadData.forEach(author_data => {
        if (author_data.strip()) {
          creator = author_data.split("\t");
          author_data_dict["name"] = {"name": creator[0], "affiliation": creator[1], "orcid": creator[2]};
        }       
      });
      
    author_data_fp.close();
  }
  if (("authors" in args && args.authors)) {
    metadata["creators"] = [];
    let authersData = args.authors.split(";")
     authersData.forEach(author => {
        author_info = author_data_dict.get(author, null);
        metadata["creators"].append({
          "name": author,
          "affiliation": (author_info ? author_info["affiliation"] : ""),
          "orcid": (author_info ? author_info["orcid"] : "")
        });
        
      });
    
  }
  /*
  in_es6\((".*"), *args\)
  $1 in args
  */
  if (("zotero_link" in args && args.zotero_link)) {
       metadata["related_identifiers"] = [{
      "identifier": args.zotero_link,
      "relation": "isAlternateIdentifier",
      "resource_type": "other",
      "scheme": "url"
    }];
  }
  return metadata;
}
