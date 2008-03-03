// LICENSE BLOCK TODO


const CC = Components.classes;
const CI = Components.interfaces;


/* from nspr's prio.h */
const PR_RDONLY      = 0x01;
const PR_WRONLY      = 0x02;
const PR_RDWR        = 0x04;
const PR_CREATE_FILE = 0x08;
const PR_APPEND      = 0x10;
const PR_TRUNCATE    = 0x20;
const PR_SYNC        = 0x40;
const PR_EXCL        = 0x80;

var ios = CC["@mozilla.org/network/io-service;1"]
    .getService(CI.nsIIOService);

var cp_prefs = Components.classes['@mozilla.org/preferences-service;1']
                         .getService(Components.interfaces.nsIPrefService)
                         .getBranch('extensions.contentpackmaker.');

function $(x) { return document.getElementById(x); }

var cp_controller = {
  manifest: [],
  init: function() {
    dump("JMC: Init'ing cp_controller\n");
    cp_controller.faves_coop = CC["@flock.com/singleton;1"]
                        .getService(CI.flockISingleton)
                        .getSingleton("chrome://flock/content/common/load-faves-coop.js")
                        .wrappedJSObject;
    var dropListener =  {
      handleEvent: function(event) {
        nsDragAndDrop.drop(event, cp_dnd);
      }
    }
    $('cp_main_dnd_target').addEventListener('dragdrop',  dropListener, true);
    //JMC TODO - Remove listener, no leaky
    if (cp_prefs.getPrefType("defaultlocation")) {
      cp_controller.set_base_dir(cp_prefs.getCharPref("defaultlocation")); 
    }
    if (cp_prefs.getPrefType("defaultpackname")) {
      cp_controller.set_pack_name(cp_prefs.getCharPref("defaultpackname"));
    }
    
  },
  
  show_directory_picker: function() {
     var fp = CC["@mozilla.org/filepicker;1"].createInstance(CI.nsIFilePicker);
     fp.init(window, "Where to save your contentpack", CI.nsIFilePicker.modeGetFolder);
     // fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText);

     var rv = fp.show();
     if (rv == CI.nsIFilePicker.returnOK || rv == CI.nsIFilePicker.returnReplace) {
       var file = fp.file;
       // Get the path as string. Note that you usually won't 
       // need to work with the string paths.
       var path = fp.file.path;
       // work with returned nsILocalFile...
       this.set_base_dir(path);
     }
  },
  
  show_top_image_picker: function () {
     var fp = CC["@mozilla.org/filepicker;1"].createInstance(CI.nsIFilePicker);
     fp.init(window, "Pick your top image", CI.nsIFilePicker.modeOpen);
     var rv = fp.show();
     if (rv == CI.nsIFilePicker.returnOK) {
       var file = fp.file;
       var path = fp.file.path;
       this.top_image_path = path;
     }
  },
  
  show_bottom_image_picker: function () {
     var fp = CC["@mozilla.org/filepicker;1"].createInstance(CI.nsIFilePicker);
     fp.init(window, "Pick your bottom image", CI.nsIFilePicker.modeOpen);
     var rv = fp.show();
     if (rv == CI.nsIFilePicker.returnOK) {
       var file = fp.file;
       var path = fp.file.path;
       this.bottom_image_path = path;
     }
  },
  
  set_pack_name: function(aName) {
    cp_controller.cp_name = aName.replace(" ", "-");
    cp_prefs.setCharPref("defaultpackname", cp_controller.cp_name);
    $('cp_name').value = cp_controller.cp_name;
  },
  
  set_base_dir: function(aPath) {
    this.cp_path = aPath;
    $('cp_base_path').setAttribute("value", aPath);
    cp_prefs.setCharPref("defaultlocation", this.cp_path);
  },
  
  write_pack: function() {
    var params = [
     {find: /\%EXTENID\%/g, subst: this.cp_name + "@contentpack.flock"}, 
     {find: /\%EXTENNAME\%/g, subst: this.cp_name},
     {find: /\%UPGRADEURL\%/g, subst: this.upgradeurl},
     {find: /\%FIRSTRUNURL\%/g, subst: this.firstrunurl},
     {find: /\%HOMEPAGEURL\%/g, subst: this.homepageurl},
     {find: /\%DESCRIPTION\%/g, subst: this.exten_description}
     ];
    var templatePath = "chrome://contentpackmaker/content/template";
    var basePath = this.cp_path + "/" + this.cp_name;
    this.make_dir(basePath);
    this.copy_file(templatePath + "/install.rdf.template", basePath + "/install.rdf", params);
    this.copy_file(templatePath + "/chrome.manifest.template", basePath + "/chrome.manifest", params);
    
    
    // JMC - TODO - directory traversal of chrome - possible?
    this.make_dir(basePath + "/chrome");
    this.make_dir(basePath + "/chrome/content");
    this.copy_file(templatePath + "/contentpack.js.template", basePath + "/chrome/content/contentpack.js", params);
    this.copy_file(templatePath + "/contentpack-coop.js.template", basePath + "/chrome/content/contentpack-coop.js", params);
    this.copy_file(templatePath + "/affinityskin.xul.template", basePath + "/chrome/content/affinityskin.xul", params);
    this.copy_file(templatePath + "/affinityskin.css.template", basePath + "/chrome/content/affinityskin.css", params);
    
    this.make_dir(basePath + "/chrome/locale");
    this.make_dir(basePath + "/chrome/locale/en-US");
    this.make_dir(basePath + "/chrome/locale/en-US/profile");
    
    var defaultFavesFile = basePath + "/chrome/locale/en-US/profile/defaultBookmarks.js";
    this.write_file(defaultFavesFile, this.serialize_manifest("favorites"));
    var defaultFeedsFile = basePath + "/chrome/locale/en-US/profile/defaultFeeds.opml";
    this.write_file(defaultFeedsFile, this.serialize_opml());
    this.write_file(basePath + "/chrome/locale/en-US/profile/defaultMedia.js", "");
    
    // Create Skin
    
    // Create Defaults
    
    this.make_dir(basePath + "/defaults");
    this.make_dir(basePath + "/defaults/preferences");
    this.copy_file(templatePath + "/prefs.js.template", basePath + "/defaults/preferences/" + this.cp_name + "-prefs.js", params);
  },
  
  
  copy_file: function flock_copyFileTo(aFilePath, aTargetPath, aSubst) {
    var contents = getContents(aFilePath);
    if (aSubst) {
      for (x in aSubst) {
       contents = contents.replace( aSubst[x].find, aSubst[x].subst); 
      }
    }
    this.write_file(aTargetPath, contents);
  },
  
  // Write to the file system
  write_file: function(aFilePath, aContents) {
    var mode = PR_TRUNCATE;
    var outfile = cp_getFileFromURL(aFilePath);
    if (!outfile.exists()) {
      outfile.create(CI.nsIFile.NORMAL_FILE_TYPE, 0600);
    }
    var outStream = CC["@mozilla.org/network/file-output-stream;1"]
                    .createInstance(CI.nsIFileOutputStream);
    // 0600 == -rw------- file permissions
    outStream.init(outfile, PR_WRONLY | PR_CREATE_FILE | mode, 0600, 0);
    outStream.write(aContents, aContents.length);
    outStream.close();
  },
  
  make_dir: function(aPath) {
    var outfile = cp_getFileFromURL(aPath);
    if (!outfile.exists()) {
      outfile.create(CI.nsIFile.DIRECTORY_TYPE, 0600);
    }
  },
  
  add_manifest_url: function (aUrl, aParent) {
    var line = document.createElement("listitem");
    line.setAttribute("label", aUrl);
    $('cp_manifest').appendChild(line);
  },
  
  add_to_manifest: function(aObj) {
    var lines = aObj.split("\n");
    var coopObj = this.faves_coop.get(lines[0]);
    if (coopObj) {
      this.manifest.push(coopObj);
      this.add_manifest_url(coopObj.name, null);
      if (coopObj.children) {
        var childEnum = coopObj.children.enumerate();
        while (childEnum.hasMoreElements()) {
          var child = childEnum.getNext();
         // this.manifest.push(coopObj);
          this.add_manifest_url(child.name, coopObj);
        }
      }
    }
  },
  
  serialize_single_child: function(aObj, aParent) {
    return "\naddBookmarkTo(\"" +  aObj.name.replace("&", "&amp;") + "\", \
       \"" + aObj.URL.replace("&", "&amp;") + "\", null, " + aParent + "); \n";
  },
  
  serialize_single_feed: function(aObj) {
    return "<outline type=\"rss\" text=\"" + aObj.name +"\" title=\"" + aObj.name + "\" xmlUrl=\"" + aObj.URL.replace("&", "&amp;")  + "\"/>\n";
  },
  
  serialize_manifest: function(type) {
    var outputString = "";
    var looseChildren = "";
    var faves_coop = this.faves_coop;
    for (var i=0; i < this.manifest.length; i++) {
      var coopObj = this.manifest[i];
      if (coopObj.isInstanceOf(faves_coop.Folder)) {
        if (coopObj.id() == faves_coop.toolbar.folder.id()) {
          outputString += "\nvar contentpackfolder" + i + " = coop.toolbar.folder;\n\n"; 
        } else {
          outputString += "\nvar contentpackfolder" + i + 
          " = new coop.Folder(\"" + coopObj.id()   + "\"); \
          \ncontentpackfolder" + i + ".name = '" + coopObj.name   + "'; \
          \ncoop.bookmarks_root.children.addOnce(contentpackfolder" + i + "); \n\n";
        }
        if (coopObj.children) {
          var childEnum = coopObj.children.enumerate();
          while (childEnum.hasMoreElements()) {
            var child = childEnum.getNext();
            outputString += this.serialize_single_child(child, "contentpackfolder" + i);
          }
        }
        
      } else {
         outputString += this.serialize_single_child(coopObj, "coop.bookmarks_root");
      }
    }
    return outputString;
  },
  
  serialize_opml: function() {
    var faves_coop = cp_controller.faves_coop;
    var outputString = "<?xml version=\"1.0\" encoding=\"UTF-8\"?> \
    <opml version=\"1.0\"> \
      <head> \
        <title>Default Feeds</title> \
      </head> \
      <body> ";
    for (var i=0; i < this.manifest.length; i++) {
      var coopObj = this.manifest[i];
      if (coopObj.isInstanceOf(faves_coop.FeedFolder)) {
        outputString += "<outline text=\"" + coopObj.name   + "\">\n";
        if (coopObj.children) {
          var childEnum = coopObj.children.enumerate();
          while (childEnum.hasMoreElements()) {
            var child = childEnum.getNext();
            if (child.isInstanceOf(faves_coop.Feed)) {
              outputString += this.serialize_single_feed(child);
            }
          }
        }
        outputString += "</outline>";
      } else if (coopObj.isInstanceOf(faves_coop.Feed)) {
          outputString += this.serialize_single_feed(coopObj);
      }
    }
    outputString += "</body></opml>";
    return outputString;
  },
  
  //TODO - Loading method
}


function flock_getChromeFile(aChromeURL) {
  return getFileInternal(aChromeURL);
}

function getContents(aURL){
  var scriptableStream=Components
    .classes["@mozilla.org/scriptableinputstream;1"]
    .getService(Components.interfaces.nsIScriptableInputStream);

  var channel=ios.newChannel(aURL,null,null);
  var input=channel.open();
  scriptableStream.init(input);
  var str=scriptableStream.read(input.available());
  scriptableStream.close();
  input.close();
  return str;
}

function cp_getFileFromURL(aURL) {
    aURL = "file://" + aURL;
    return getFileInternal(aURL);
}

function getFileInternal(aURL) {
    var fileHandler = ios.getProtocolHandler("file")
        .QueryInterface(Components.interfaces.nsIFileProtocolHandler);
    var sourceSpec = fileHandler.getFileFromURLSpec(aURL);
    var sourceFile = CC["@mozilla.org/file/local;1"]
        .createInstance(CI.nsILocalFile);
    sourceFile.initWithFile(sourceSpec);
    return sourceFile;
}

window.addEventListener('load', cp_controller.init, true);