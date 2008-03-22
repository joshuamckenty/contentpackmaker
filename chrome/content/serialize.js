
function cp_serializer(aManifest, aFavesCoop) {
  this.manifest = aManifest;
  this.gIdx = 1;
  this.faves_coop = aFavesCoop;
  this.serialize_single_child.toolbarid = aFavesCoop.toolbar.folder.id();
}

cp_serializer.prototype = { 
  serialize_single_child: {
    "Favorite": function(aObj, aParent) {
      return "\naddBookmarkTo(\"" 
        +  aObj.name.replace(/&/g, "&amp;") + "\", \"" 
         + aObj.URL + "\", \"" 
         + aObj.description + "\", " + aParent + ", \"" 
         + aObj.id() + "\", \"" + aObj.favicon + "\"); \n";
    },
    "MediaQuery": function(aObj, aParent) {
      return "\addMediaQueryTo(\"" +  aObj.name.replace(/&/g, "&amp;") + "\", \
         \"" + decodeURIComponent(aObj.query) + "\", '" + aObj.service + "', null, \"" + aObj.id() + "\"); \n";
    },
    "Folder": function(aObj, aParent, idx) {
      if (aObj.id() == "urn:flock:toolbar" ||
          aObj.id() == this.toolbarid) {
        return "\nvar cpfolder" + idx + " = coop.toolbar.folder;\n\n"; 
      } else {
        return "\nvar cpfolder" + idx +" = new coop.Folder(); \
        \ncpfolder" + idx + ".name = '" + aObj.name   + "'; \n"
        + aParent + ".children.addOnce(cpfolder" + idx + "); \n\n";
      }
    },
    "Feed" : function(aObj, aParent) {
      return "<outline type=\"rss\" text=\"" 
        + aObj.name +"\" title=\"" 
        + aObj.name + "\" xmlUrl=\"" 
        + aObj.URL.replace(/&/g, "&amp;")  + "\"/>\n";
    },
  },
  
  serialize_opml: function() {
    var outputString = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<opml version=\"1.0\">\n \
      <head>\n <title>Default Feeds</title>\n</head>\n<body>\n ";
    outputString += this.serialize_manifest("Feed");
    outputString += "</body>\n</opml>\n";
    return outputString;
  },
  
  serialize_manifest: function(type) {
    var outputString = "";
    this.gIdx = 1;
    for (var i=0; i < this.manifest.length; i++) {
      var coopObj = this.manifest[i];
      outputString += this.serialize_object(coopObj, null, type);
    }
    return outputString;
  },
  
  serialize_object: function (aObj, aParent, type) {
    var outputString = "";
    if (!aParent) aParent = "coop.bookmarks_root";
     if (this.compare_type(aObj, "FeedFolder") || (this.compare_type(aObj, "Folder") && type == "Feed")) {
      outputString += "<outline text=\"" + aObj.name   + "\">\n";
      var childEnum = aObj.children.enumerate();
      while (childEnum.hasMoreElements()) {
        outputString += this.serialize_object(childEnum.getNext(), aParent, type);
      }
      outputString += "</outline>\n";
    } else if (this.compare_type(aObj, "Folder")) {
      if (aObj.children) {
        var i = ++this.gIdx;
        outputString += this.serialize_single_child["Folder"](aObj, aParent, i);
        var childEnum = aObj.children.enumerate();
        while (childEnum.hasMoreElements()) {
          outputString += this.serialize_object(childEnum.getNext(), "cpfolder" + i, type);
        }
      }
    } else if (this.compare_type(aObj, type)) {
       outputString += this.serialize_single_child[type](aObj, aParent);
    }
    return outputString;
  },
  
  compare_type: function(aObj, aType) {
    if (aObj.type) {
      if (aObj.type == aType) return true;
    } else {
      if (aObj.isInstanceOf(this.faves_coop[aType])) return true;
    }  
    return false;
  },
}