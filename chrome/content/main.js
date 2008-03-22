// LICENSE BLOCK TODO




// JMC TODO:
/*
Support for web clipboard contents
Support for more DND flavours (URL, FF3 data types, etc).
*/



var cp_controller = {
  manifests: {},
  fileList: [],
  
  exten_description: null,
  firstrunurl: null,
  upgradeurl: null,
  homepageurl: null,
  location: null,
  packProps: ["exten_description", "firstrunurl", 
              "upgradeurl", "homepageurl", 
              "cp_name", "location", 
              "maintoolbarset", "personaltoolbarset"],
  
  get cp_name() { return this._cp_name; },
  set cp_name(val) { this._cp_name = val.replace(" ", "-").toLowerCase(); },
  
  init: function() {
    dump("JMC: Init'ing cp_controller\n");
    cp_controller.faves_coop = CC["@flock.com/singleton;1"]
                        .getService(CI.flockISingleton)
                        .getSingleton("chrome://flock/content/common/load-faves-coop.js")
                        .wrappedJSObject;
    cp_controller.clear_manifest();
    for (var i=0; i < cp_controller.packProps.length; i++) {
      var prop = cp_controller.packProps[i];
      try {
        if (cp_prefs.getPrefType(prop) == cp_prefs.PREF_STRING) {
          cp_controller.set_pack_property(prop, cp_prefs.getCharPref(prop)); 
        } 
      } catch (ex) { }
    }
  },
  
  set_pack_property: function(aPropName, aPropValue) {
    this[aPropName] = aPropValue;
    if ($(aPropName)) $(aPropName).value = aPropValue;
    cp_prefs.setCharPref(aPropName, aPropValue);
  },
  
  _select_extension_directory: function() {
     var fp = CC["@mozilla.org/filepicker;1"].createInstance(CI.nsIFilePicker);
     fp.init(window, "Where to save your contentpack", CI.nsIFilePicker.modeSave);
     var rv = fp.show();
     if (rv == CI.nsIFilePicker.returnOK || rv == CI.nsIFilePicker.returnReplace) {
       this.set_pack_property("location", fp.file.parent.path);
       this.set_pack_property("cp_name", fp.file.leafName);
       return true;
     }
     return false;
  },
  
  write_pack: function() {
    if (!cp_controller._select_extension_directory()) return;
    cp_controller.set_pack_property("exten_description", $("exten_description").value);
    var regexpparams = [
     {find: /\%EXTENID\%/g, subst: this.cp_name + "@contentpack.flock"}, 
     {find: /\%EXTENNAME\%/g, subst: this.cp_name},
     {find: /\%UPGRADEURL\%/g, subst: this.upgradeurl},
     {find: /\%FIRSTRUNURL\%/g, subst: this.firstrunurl},
     {find: /\%HOMEPAGEURL\%/g, subst: this.homepageurl},
     {find: /\%DESCRIPTION\%/g, subst: this.exten_description},
     {find: /\%MAINTOOLBAR\%/g, subst: this.maintoolbarset},
     {find: /\%PTOOLBAR\%/g, subst: this.personaltoolbarset}
     ];
    var templatePath = "chrome://contentpackmaker/content/template";
    var basePath = this.location + "/" + this.cp_name;
    
    make_dir(basePath + "/chrome/content");
    make_dir(basePath + "/chrome/locale/en-US/profile");
    make_dir(basePath + "/defaults/preferences");
    var skinDir = make_dir(basePath + "/chrome/skin");
    
    for (var j=0; j < gFilePaths.length; j++) {
      var fpObj = gFilePaths[j];
      var fileList = fpObj.files;
      for (var i=0; i < fileList.length; i++) {
       copy_file(templatePath + "/" + fileList[i] + ".template", basePath + fpObj.path + fileList[i], regexpparams);
      }
    }
    copy_file(templatePath + "/prefs.js.template", basePath + "/defaults/preferences/" + this.cp_name + "-prefs.js", regexpparams);
    
    // Create Skin
    for(var i=0; i < this.fileList.length; i++) {
      var fileObj = this.fileList[i];
      var existingImage = getFileFromPath(basePath + "/chrome/skin/" + fileObj.filename);
      if (existingImage.exists()) {
       existingImage.remove(false); 
      }
      fileObj.file.copyTo(skinDir, fileObj.filename);
      if (imageRules[fileObj.filename].chrome != "") {
        append_to( basePath + "/chrome.manifest", this.make_chrome_override(fileObj.filename));
      }
    }
    
    var serializer = new cp_serializer(this.manifests["Favorite"], this.faves_coop);
    write_file(basePath + "/chrome/locale/en-US/profile/defaultBookmarks.js", serializer.serialize_manifest("Favorite"));
    serializer = new cp_serializer(this.manifests["Feed"], this.faves_coop);
    write_file(basePath + "/chrome/locale/en-US/profile/defaultFeeds.opml", serializer.serialize_opml());
    serializer = new cp_serializer(this.manifests["MediaQuery"], this.faves_coop);
    write_file(basePath + "/chrome/locale/en-US/profile/defaultMedia.js",  serializer.serialize_manifest("MediaQuery"));
    alert("Now don't forget to run build.sh in the target directory!");
  },
  
  set_toolbarsets: function () {
    var win = getTopBrowserWindow();
    cp_controller.set_pack_property("maintoolbarset", 
      win.document.getElementById("nav-bar").getAttribute("currentset"));
    cp_controller.set_pack_property("personaltoolbarset", 
      win.document.getElementById("PersonalToolbar").getAttribute("currentset"));
  },
  
  make_chrome_override: function(aFileName) {
    var aImageObj = imageRules[aFileName];
    return "override " + aImageObj.chrome  
        + " chrome://" + this.cp_name 
        + "/skin/" + aFileName + "\n";
  },
  
  add_to_manifest_display: function (aLabel, aObj) {
    var line = document.createElement("listitem");
    line.setAttribute("label", aLabel);
    if (aObj.path) {
      line.setAttribute("path", aObj.path);
    } else {
      line.setAttribute("coopid", aObj.id());
    }
    $('cp_manifest').appendChild(line);
  },
  
  add_url_to_manifest: function(aString) {
    dump("JMC: Adding URL " + aString + "\n");
    var lines = aString.split("\n");
    var coopObj = this.faves_coop.get(lines[0]);
    if (coopObj) {
      this.add_obj_to_manifest(coopObj);
    }
  },
  
  add_obj_to_manifest: function(aObj, aPrefix) {
    if (!aPrefix) aPrefix = "";
    var type = this.get_type(aObj);
    var label = "[" + type + "] " + aObj.name;
    this.add_to_manifest_display(aPrefix + label, aObj);
    if (aPrefix == "") {
      var manifestType = type;
      if (type == "Folder" || type == "FeedFolder") {
        if (!aObj.children) return;
        var manifestType = this.type_of_children(aObj);
      }
      this.manifests[manifestType].push(aObj);
    }
    if (((type == "Folder") || (type == "FeedFolder")) && aObj.children) {
      var childEnum = aObj.children.enumerate();
      while (childEnum.hasMoreElements()) {
        var child = childEnum.getNext();
        this.add_obj_to_manifest(child, aPrefix + "--");
      }
    }
  },
  
  type_of_children: function(aCoopObj) {
    var childEnum = aCoopObj.children.enumerate();
    while (childEnum.hasMoreElements()) {
      var child = childEnum.getNext();
      var type = this.get_type(child);
      if (type != "Folder" && type != "FeedFolder") {
        return type;  
      } 
    }
  },
  
  _make_manifest_obj_string: function (aCoopObj) {
    var type = this.get_type(aCoopObj);
    var id = aCoopObj.id();
    if (id == this.faves_coop.toolbar.folder.id()) id = "urn:flock:toolbar";
    var maniObj = "{ \
      id: function() { return \"" + id + "\" }, \n\
      name: \"" + aCoopObj.name + "\" , \n\
      type: \"" + type + "\" , \n\
      query: \"" + aCoopObj.query + "\" , \n\
      URL: \"" + aCoopObj.URL + "\" , \n\
      service: \"" + ((typeof aCoopObj.service == 'string') ? aCoopObj.service : "null") + "\" , \n\
      favicon: \"" + ((aCoopObj.favicon) ? aCoopObj.favicon : "null") + "\" , \n\
      description: \"" + aCoopObj.description + "\" , \n";
    if ((type == "Folder" || type == "FeedFolder") && aCoopObj.children) {
      maniObj += "\
      children: { enumerate: function() {\n return { \n\
          getNext: function() { return this.results.shift() }, \n\
          hasMoreElements: function() { return this.results.length > 0; }, \n\
          results: [\n";
      var childEnum = aCoopObj.children.enumerate();
      while (childEnum.hasMoreElements()) {
        var child = childEnum.getNext();
        maniObj += this._make_manifest_obj_string(child) + ",\n";
      }    
      maniObj += "]\n }\n }\n }\n";
    } else {
      maniObj += "children: false\n";
    }
    maniObj += "}";
    return maniObj;
  },
  
  remove_from_manifest: function(item) {
    if (!item) item = $('cp_manifest').selectedItem;
    item.parentNode.removeChild(item);
    if (item.hasAttribute("coopid")) {
      var targetId = item.getAttribute("coopid");
      for (x in this.manifests) {
       var manifest = this.manifests[x];
       for (var i =0; i < manifest.length; i++) {
         var item = manifest[i];
         if (item.id() == targetId) {
           manifest.splice(i,1); 
         }
       }
      }
    } else {
      // JMC TODO - Find and remove from fileList
    }
  },
  
  receive_file: function(aFile) {
    var fileBits = aFile.path.split("/");
    var fileName = fileBits.pop();
    if (imageRules[fileName]) {
      this.add_to_manifest_display("[Image] " + fileName, aFile, null);
      var win = getTopBrowserWindow();
      if (win) {
        imageRules[fileName].apply(win, aFile.path); 
      }
      this.fileList.push({filename: fileName, file: aFile});
    }
  },
  
  save_project: function () {
    cp_controller.set_pack_property("exten_description", $("exten_description").value);
    var fp = CC["@mozilla.org/filepicker;1"].createInstance(CI.nsIFilePicker);
    fp.defaultString = "manifest.js";
    if (cp_prefs.getPrefType("location")) {
      fp.displayDirectory = getFileFromPath(cp_prefs.getCharPref("location"));
    }
    fp.init(window, "Where to save your manifest", CI.nsIFilePicker.modeSave);
    fp.appendFilter("ContentPack Manifests", "*.js");
    var rv = fp.show();
    if (rv == CI.nsIFilePicker.returnOK || rv == CI.nsIFilePicker.returnReplace) {
      this.save_manifest_file(fp.file.path);
    }
  },
  
  load_project: function () {
    var fp = CC["@mozilla.org/filepicker;1"].createInstance(CI.nsIFilePicker);
    if (cp_prefs.getPrefType("location")) {
      fp.displayDirectory = getFileFromPath(cp_prefs.getCharPref("location"));
    }
    fp.appendFilter("ContentPack Manifests", "*.js");
    fp.init(window, "Load your Project...", CI.nsIFilePicker.modeOpen);
    var rv = fp.show();
    if (rv == CI.nsIFilePicker.returnOK) {
      this.load_manifest_file(fp.file.path);
    }
  },
  
  save_manifest_file: function(aFilePath) {
   var outputString = "";
   outputString += "cp_controller.clear_manifest();\n";
   for (x in this.manifests) {
     var manifest = this.manifests[x];
     for (var i =0; i < manifest.length; i++) {
       var item = manifest[i];
       outputString += "cp_controller.add_obj_to_manifest(\n";
       outputString += this._make_manifest_obj_string(item) + ");\n";
     }
   }
   
   outputString += "cp_controller.fileList = [];\n";
   for (var i =0; i <this.fileList.length; i++) {
     var item = this.fileList[i];
     outputString += "cp_controller.receive_file(getFileFromPath(\"" 
      + this.fileList[i].file.path + "\"));\n";
   }
  
   for (var i=0; i < this.packProps.length; i++) {
     if (this[this.packProps[i]])
      outputString += "cp_controller.set_pack_property(\"" 
        + this.packProps[i]  + "\", \"" 
        + this[this.packProps[i]].replace(/\n/g, "\\n") +"\");\n";
   }
   write_file(aFilePath, outputString);
  },

  load_manifest_file: function(aFilePath) {
    cp_controller.clear_manifest();
    var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                  .getService(Components.interfaces.mozIJSSubScriptLoader);
    loader.loadSubScript("file://" + aFilePath, window);
  },

  clear_manifest: function() {
    while ($('cp_manifest').firstChild) {
     $('cp_manifest').removeChild($('cp_manifest').lastChild);
    } 
    cp_controller.manifests = {};
    cp_controller.manifests["Feed"] = [];
    cp_controller.manifests["MediaQuery"] = [];
    cp_controller.manifests["Favorite"] = [];
    
    cp_controller.fileList = [];
    for (var i=0; i < cp_controller.packProps.length; i++) {
      if ($(cp_controller.packProps[i])) $(cp_controller.packProps[i]).value = "";
    }
  },
  
  get_type: function(aObj) {
    var type = "Folder";
    if (this.compare_type(aObj, "MediaQuery")) type = "MediaQuery";
    if (this.compare_type(aObj, "Favorite")) type = "Favorite";
    if (this.compare_type(aObj, "Feed")) type = "Feed";
    if (this.compare_type(aObj, "FeedFolder")) type = "FeedFolder";
    return type;
  },
  
  compare_type: function(aObj, aType) {
    if (aObj.type) {
      if (aObj.type == aType) return true;
    } else {
      if (aObj.isInstanceOf(this.faves_coop[aType])) return true;
    }  
    return false;
  }
}


window.addEventListener('load', cp_controller.init, true);