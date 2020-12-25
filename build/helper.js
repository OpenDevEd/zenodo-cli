"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMetadata = exports.parseIds = exports.dumpJSON = exports.showDepositionJSON = exports.parseId = exports.loadConfig = exports.in_es6 = void 0;
const fs = __importStar(require("fs"));
const FALLBACK_CONFIG_FILE = (process.env.HOME + "/.config/zenodo-cli/config.json");
function in_es6(left, right) {
    if (((right instanceof Array) || ((typeof right) === "string"))) {
        return (right.indexOf(left) > (-1));
    }
    else {
        if (((right instanceof Map) || (right instanceof Set) || (right instanceof WeakMap) || (right instanceof WeakSet))) {
            return right.has(left);
        }
        else {
            return (left.indexOf(right) !== -1);
        }
    }
}
exports.in_es6 = in_es6;
function loadConfig(configFile) {
    if (fs.statSync(configFile).isFile()) {
    }
    else {
        if (fs.statSync(FALLBACK_CONFIG_FILE).isFile()) {
            configFile = FALLBACK_CONFIG_FILE;
        }
        else {
            console.log(`Config file not present at config.json or ${FALLBACK_CONFIG_FILE}`);
            process.exit(1);
        }
    }
    const content = fs.readFileSync(configFile, "utf8");
    const config = JSON.parse(content);
    const params = { "access_token": config["accessToken"] };
    let zenodoAPIUrl = "";
    if ((config["env"] === "sandbox")) {
        zenodoAPIUrl = "https://sandbox.zenodo.org/api/deposit/depositions";
    }
    else {
        zenodoAPIUrl = "https://zenodo.org/api/deposit/depositions";
    }
    return { params, zenodoAPIUrl };
}
exports.loadConfig = loadConfig;
function parseId(id) {
    var dot_split, slash_split;
    if (!isNaN(id.toString)) {
        return id;
    }
    slash_split = id.toString().split("/").slice((-1))[0];
    if (!isNaN(slash_split)) {
        id = slash_split;
    }
    else {
        dot_split = id.toString().split(".").slice((-1))[0];
        if (!isNaN(dot_split)){
            id = dot_split;
        }
    }
    return id;
}
exports.parseId = parseId;
function showDepositionJSON(info) {
    console.log(`Title: ${info["title"]}`);
    if (in_es6("publication_date", info["metadata"])) {
        console.log(`Date: ${info["metadata"]["publication_date"]}`);
    }
    else {
        console.log("Date: N/A");
    }
    console.log(`RecordId: ${info["id"]}`);
    if (in_es6("conceptrecid", info.keys())) {
        console.log(`ConceptId: ${info["conceptrecid"]}`);
    }
    else {
        console.log("ConceptId: N/A");
    }
    console.log(`DOI: ${info["metadata"]["prereserve_doi"]["doi"]}`);
    console.log(`Published: ${info["submitted"] ? "yes" : "no"}`);
    console.log(`State: ${info["state"]}`);
    console.log(`URL: https://zenodo.org/${info["submitted"] ? "record" : "deposit"}/${info["id"]}`);
    if (in_es6("bucket", info["links"].keys())) {
        console.log(`BucketURL: ${info["links"]["bucket"]}`);
    }
    else {
        console.log("BucketURL: N/A");
    }
    console.log("\n");
}
exports.showDepositionJSON = showDepositionJSON;
function dumpJSON(info) {
    console.log(info);
    console.log("\n");
}
exports.dumpJSON = dumpJSON;
function parseIds(genericIds) {
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
exports.parseIds = parseIds;
function updateMetadata(args, metadata) {
    var author_data_dict, author_data_fp, author_info, comm, creator, meta_file;
    author_data_dict = {};
    if ((in_es6("json", args.__dict__) && args.json)) {
        meta_file = open(args.json);
        //for (key, value) in json.load(meta_file).items():
        //metadata[key] = value
        meta_file.close();
    }
    if (in_es6("creators", metadata)) {
        var _pj_auth = [], _pj_b = metadata["creators"];
        for (var _pj_c = 0, _pj_d = _pj_b.length; (_pj_c < _pj_d); _pj_c += 1) {
            var creator = _pj_b[_pj_c];
            _pj_auth.push(creator["name"]);
        }
        metadata["authors"] = _pj_auth.join(";");
    }
    if ((in_es6("title", args.__dict__) && args.title)) {
        metadata["title"] = args.title;
    }
    if ((in_es6("date", args.__dict__) && args.date)) {
        metadata["publication_date"] = args.date;
    }
    if ((in_es6("description", args.__dict__) && args.description)) {
        metadata["description"] = args.description;
    }
    if ((in_es6("add_communites", args.__dict__) && args.add_communites)) {
        var _pj_com = [], _pj_b = args.add_communities;
        for (var _pj_c = 0, _pj_d = _pj_b.length; (_pj_c < _pj_d); _pj_c += 1) {
            var community = _pj_b[_pj_c];
            _pj_com.push({ "identifier": community });
        }
        metadata["communities"] = _pj_com;
    }
    if ((in_es6("remove_communities", args.__dict__) && args.remove_communities)) {
        var _pj_rrcom = [], _pj_b = metadata["communities"];
        for (var _pj_c = 0, _pj_d = _pj_b.length; (_pj_c < _pj_d); _pj_c += 1) {
            var community = _pj_b[_pj_c];
            if (!in_es6(community, args.remove_communities)) {
                _pj_rrcom.push({ "identifier": community });
            }
        }
        metadata["communities"] = _pj_rrcom;
    }
    if ((in_es6("communities", args.__dict__) && args.communities)) {
        comm = open(args.communities);
        metadata["communities"] = function () {
            var _pj_a = [], _pj_b = comm.read().splitlines();
            for (var _pj_c = 0, _pj_d = _pj_b.length; (_pj_c < _pj_d); _pj_c += 1) {
                var community = _pj_b[_pj_c];
                _pj_a.push({ "identifier": community });
            }
            return _pj_a;
        }
            .call(this);
        comm.close();
    }
    if ((in_es6("authordata", args.__dict__) && args.authordata)) {
        author_data_fp = open(args.authordata);
        for (var author_data, _pj_c = 0, _pj_a = author_data_fp.read().splitlines(), _pj_b = _pj_a.length; (_pj_c < _pj_b); _pj_c += 1) {
            author_data = _pj_a[_pj_c];
            if (author_data.strip()) {
                creator = author_data.split("\t");
                author_data_dict["name"] = { "name": creator[0], "affiliation": creator[1], "orcid": creator[2] };
            }
        }
        author_data_fp.close();
    }
    if ((in_es6("authors", args.__dict__) && args.authors)) {
        metadata["creators"] = [];
        for (var author, _pj_c = 0, _pj_a = args.authors.split(";"), _pj_b = _pj_a.length; (_pj_c < _pj_b); _pj_c += 1) {
            author = _pj_a[_pj_c];
            author_info = author_data_dict.get(author, null);
            metadata["creators"].append({
                "name": author,
                "affiliation": (author_info ? author_info["affiliation"] : ""),
                "orcid": (author_info ? author_info["orcid"] : "")
            });
        }
    }
    if ((in_es6("zotero_link", args.__dict__) && args.zotero_link)) {
        metadata["related_identifiers"] = [{
                "identifier": args.zotero_link,
                "relation": "isAlternateIdentifier",
                "resource_type": "other",
                "scheme": "url"
            }];
    }
    return metadata;
}
exports.updateMetadata = updateMetadata;
//# sourceMappingURL=helper.js.map