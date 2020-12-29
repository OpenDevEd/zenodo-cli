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

  const params = { "access_token": config["accessToken"] };

  let zenodoAPIUrl = "";
  if ((config["env"] === "sandbox")) {
    zenodoAPIUrl = "https://sandbox.zenodo.org/api/deposit/depositions";
  } else {
    zenodoAPIUrl = "https://zenodo.org/api/deposit/depositions";
  }
  return { params, zenodoAPIUrl }
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
  // This function takes an existing object (metadata) and applies changes indicated by args.
  console.log("Updating metadata")
  let author_data_dict, author_data_fp, author_info, comm, creator;
  author_data_dict = {};
  // If the --json argument is given, load the file, and overwrite metadata accordingly.
  if (("json" in args && args.json)) {
    if (fs.existsSync(args.json)) {
      const contents = fs.readFileSync(args.json, 'utf-8')
      let metaIn = {}
      try {
        metaIn = JSON.parse(contents);
      } catch (e) {
        console.log(`Invalid json: ${contents}`)
        process.exit(1);
      }
      Object.keys(metaIn).forEach(function (key) {
        metadata[key] = metaIn[key]
      });
    } else {
      console.log(`File does not exist: ${args.json}`)
      process.exit(1);
    }
  }
  if ("authors" in args && args.authors) {
    let creatorsNew = []
    if ("creators" in metadata) {
      creatorsNew = metadata["creators"]
      let auth_arr = args.authors
      auth_arr.forEach(creator => {
        const entry = creator.split(/ *; */);
        let newentry = {}
        newentry["name"] = entry[0]
        if (entry.length > 1) {
          newentry["institution"] = entry[1]
        }
        if (entry.length > 2) {
          newentry["orcid"] = entry[2]
        }
        creatorsNew.push(newentry);
      });
    }
    metadata["creators"] = creatorsNew
  }
  if ("title" in args && args.title) {
    metadata["title"] = args.title;
  }
  if (("date" in args && args.date)) {
    metadata["publication_date"] = args.date;
  }
  if (("description" in args && args.description)) {
    metadata["description"] = args.description;
  }

  // Handle communities
  let communitiesArray = [];
  // Step 1. Get the original communities
  let metadataCommunities = metadata["communities"];
  metadataCommunities.forEach(community => {
    communitiesArray.push(community["indentifier"]);
  })
  // Step 2. Add communities specified with --add-communities
  if (("add_communites" in args && args.add_communites)) {
      args.add_communites.forEach(community => {
      communitiesArray.push(community);
    });
  }
  // Step 3. Read communities from file, via --communities file.txt
  if (("communities" in args && args.communities)) {
    if (fs.existsSync(args.communities)) {
      comm = fs.readFileSync(args.communities);
      communitiesArray.push(comm.split("\n"))
    } else {
      console.log()
    }
  }
  // Step 4. Add communities back to metadata, unless the community has been listed with --remove-communities
  let communitiesArrayFinal = []
  if (("remove_communities" in args && args.remove_communities)) {
    communitiesArray.forEach(community => {
      if (!(community in args.remove_communities && community in communitiesArrayFinal)) {
        communitiesArrayFinal.push({ "identifier": community });
      }
    });
  }
  metadata["communities"] = communitiesArrayFinal;
  // Done with communities
  console.log(JSON.stringify(metadata))
  process.exit(1);

  if (("authordata" in args && args.authordata)) {
    author_data_fp = open(args.authordata);
    let autherReadData = author_data_fp.read().splitlines()
    autherReadData.forEach(author_data => {
      if (author_data.strip()) {
        creator = author_data.split("\t");
        author_data_dict["name"] = { "name": creator[0], "affiliation": creator[1], "orcid": creator[2] };
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

/*

{
  "access_right": "open",
  "communities": [
    {
      "identifier": "ode"
    },
    {
      "identifier": "publicgoods"
    },
    {
      "identifier": "zenodo"
    }
  ],
  "creators": [
    {
      "name": "Haßler, Björn"
      "affiliation": "(affiliation)"

    },
    {
      "name": "Haseloff, Gesine"
    }
  ],
  "description": "<p>This report provides an in-depth overview about the research on technical and vocational education and training (TVET) in Sub-Saharan Africa, to identify gaps in the research and provide the impetus for further research and the formation of international research networks in TVET in Sub-Saharan Africa. This report (in English) is an expanded and revised version of an earlier report, published in 2019 in German (https://lit.bibb.de/vufind/Record/DS-184013). The present report covers the research design (methodological approach) of the report; the quality and relevance of the publications found on TVET; the concept and practice of TVET; stakeholders in TVET research and their networks; topics, perspectives and current debates of TVET research; a systematic review of reliable studies on TVET in SS; models for the design, development and delivery of TVET; gender issues; key state actors; the importance of non-governmental actors in TVET; national standards, guidelines and quality frameworks; challenges that arise when implementing guidelines and political decisions; influencing institutional framework conditions; networks for research. The final chapter offers a summary and &mdash; based on this &mdash; directs our attention to possible future developments regarding TVET and TVET research. A number of appendices present additional information, such as an annotated bibliography, the full bibliography for the report, the methodology for the interviews and structured community review, and the results of the structured community review, as well as a list of additional materials for the report.</p>",
  "doi": "10.5281/zenodo.3572897",
  "license": "CC-BY-4.0",
  "prereserve_doi": {
    "doi": "10.5281/zenodo.3572897",
    "recid": 3572897
  },
  "publication_date": "2020-10-29",
  "publication_type": "report",
  "title": "Technical and Vocational Education and Training in Sub-Saharan Africa: A Systematic Review of the Research Landscape",
  "upload_type": "publication",
  "version": "0"
}

*/