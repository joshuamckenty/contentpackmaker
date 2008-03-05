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

// JMC TODO:
/*

Support for default toolbar sets
Support for preferences settings as well (extended set)
Extended CSS hacking? Perhaps w/ firebug integration
Multi-file DND
Support for more DND flavours (URL, FF3 data types, etc).

*/

var imageRules = {
 "stbar-default.jpg"  : {
   chrome: "",
   apply: function (win, aPath) {
     var statusbars = win.document.getElementsByTagName("statusbar"); 
     for (var i = 0; i < statusbars.length; i++) { 
         statusbars[i].setAttribute("style", "background-image: url(file://" + aPath + ");");
         statusbars[i].setAttribute("affinityskin", "true");
     }
   }
 },
 "tbox-default.jpg"  : {
    chrome: "",
    apply: function (win, aPath) {
      var mainwin = win.document.getElementById('main-window');
      mainwin.setAttribute("style", "background-image: url(file://" + aPath + ");"); 
      mainwin.setAttribute("affinityskin", "true");
    }
  },
  "mecardUpperBackground.png"  : {
    chrome: "chrome://flock/skin/people/mecardUpperBackground.png",
    apply: function (win, aPath) {
       /*
       var sidebar = win.document.getElementById("sidebar").contentDocument;
       dump("JMC: Think I got sidebar, it's " + sidebar.documentElement + "\n");
       if (sidebar.documentElement.id == "peopleSidebar") {
         var peopleTabs = sidebar.getElementById("peopleServiceTabs");
         var peoplePanel = sidebar.getAnonymousElementByAttribute(peopleTabs, "anonid", "mecard-info-panel"); 
              peoplePanel.setAttribute("style", "background-image: url(file://" + aPath + ");");
          // }
       }
       */
    }
  },
  "main-nav-bg.png"  : {
     chrome: "chrome://flock/skin/start/main-nav-bg.png",
     apply: function (win, aPath) {
       // 
     }
   },
}



var cp_controller = {
  manifest: [],
  fileList: [],
  init: function() {
    dump("JMC: Init'ing cp_controller\n");
    cp_controller.faves_coop = CC["@flock.com/singleton;1"]
                        .getService(CI.flockISingleton)
                        .getSingleton("chrome://flock/content/common/load-faves-coop.js")
                        .wrappedJSObject;
  
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
     var rv = fp.show();
     if (rv == CI.nsIFilePicker.returnOK || rv == CI.nsIFilePicker.returnReplace) {
       var file = fp.file;
       var path = fp.file.path;
       this.set_base_dir(path);
     }
  },
  set_pack_name: function(aName) {
    cp_controller.cp_name = aName.replace(" ", "-").toLowerCase();
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
    this.copy_file(templatePath + "/build.sh.template", basePath + "/build.sh", params, 0700);
    
    
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
    this.write_file(defaultFavesFile, this.serialize_manifest("Favorite"));
    var defaultFeedsFile = basePath + "/chrome/locale/en-US/profile/defaultFeeds.opml";
    this.write_file(defaultFeedsFile, this.serialize_opml());
    this.write_file(basePath + "/chrome/locale/en-US/profile/defaultMedia.js",  this.serialize_manifest("MediaQuery"));
    
    // Create Skin
    var skinDir = this.make_dir(basePath + "/chrome/skin");
    for(var i=0; i < this.fileList.length; i++) {
      var fileObj = this.fileList[i];
      var existingImage = cp_getFileFromURL(basePath + "/chrome/skin/" + fileObj.filename);
      if (existingImage.exists()) {
       existingImage.remove(false); 
      }
      fileObj.file.copyTo(skinDir, fileObj.filename);
      dump("JMC: Make chrome for : " + imageRules[fileObj.filename].chrome + "?\n");
      if (imageRules[fileObj.filename].chrome != "") {
        this.append_to( basePath + "/chrome.manifest", this.make_chrome_override(fileObj.filename));
      }
    }

    // Create Defaults
    
    this.make_dir(basePath + "/defaults");
    this.make_dir(basePath + "/defaults/preferences");
    this.copy_file(templatePath + "/prefs.js.template", basePath + "/defaults/preferences/" + this.cp_name + "-prefs.js", params);
    
    alert("Now don't forget to run build.sh in the target directory!");
  },
  
  
  copy_file: function flock_copyFileTo(aFilePath, aTargetPath, aSubst, aFileMode) {
    var contents = getContents(aFilePath);
    if (aSubst) {
      for (x in aSubst) {
       contents = contents.replace( aSubst[x].find, aSubst[x].subst); 
      }
    }
    this.write_file(aTargetPath, contents, aFileMode);
  },
  
  // Write to the file system
  write_file: function(aFilePath, aContents, aFileMode) {
    var mode = PR_TRUNCATE;
    if (!aFileMode) aFileMode = 0600;
    var outfile = cp_getFileFromURL(aFilePath);
    if (!outfile.exists()) {
      outfile.create(CI.nsIFile.NORMAL_FILE_TYPE, aFileMode);
    }
    var outStream = CC["@mozilla.org/network/file-output-stream;1"]
                    .createInstance(CI.nsIFileOutputStream);
    // 0600 == -rw------- file permissions
    outStream.init(outfile, PR_WRONLY | PR_CREATE_FILE | mode, 0600, 0);
    outStream.write(aContents, aContents.length);
    outStream.close();
  },
  // JMC TODO - Refactor this into the above
  append_to: function (aFilePath, aContents) {
    var outfile = cp_getFileFromURL(aFilePath);
    var outStream = CC["@mozilla.org/network/file-output-stream;1"]
                    .createInstance(CI.nsIFileOutputStream);
    outStream.init(outfile, PR_WRONLY | PR_CREATE_FILE | PR_APPEND, 0600, 0);
    outStream.write(aContents, aContents.length);
    outStream.close();
  },
  
  make_dir: function(aPath) {
    var outfile = cp_getFileFromURL(aPath);
    if (!outfile.exists()) {
      outfile.create(CI.nsIFile.DIRECTORY_TYPE, 0600);
    }
    return outfile;
  },
  
  make_chrome_override: function(aFileName) {
    var aImageObj = imageRules[aFileName];
    return "override " + aImageObj.chrome  + " chrome://" + this.cp_name + "/skin/" + aFileName;
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
      if ((coopObj.isA(cp_controller.faves_coop.Folder) || coopObj.isA(cp_controller.faves_coop.FeedFolder)) && coopObj.children) {
        var childEnum = coopObj.children.enumerate();
        while (childEnum.hasMoreElements()) {
          var child = childEnum.getNext();
         // this.manifest.push(coopObj);
          this.add_manifest_url("-- " + child.name, coopObj);
        }
      }
    }
  },
  
  receive_file: function(aFile) {
    dump("JMC: Got drop of file with path " + aFile.path + "\n");
    var fileBits = aFile.path.split("/");
    var fileName = fileBits.pop();
    dump("JMC: Think filename is " + fileName + "\n");
    if (imageRules[fileName]) {
      this.add_manifest_url("* - " + aFile.path);
      var win = getTopBrowserWindow();
      if (win) {
        imageRules[fileName].apply(win, aFile.path); 
      }
      this.fileList.push({filename: fileName, file: aFile});
    }
  },
  
  serialize_single_child: {
    "Favorite": function(aObj, aParent) {
      return "\naddBookmarkTo(\"" +  aObj.name.replace("&", "&amp;") + "\", \
         \"" + aObj.URL.replace("&", "&amp;") + "\", null, " + aParent + "); \n";
    },
    "MediaQuery": function(aObj, aParent) {
      return "\addMediaQueryTo(\"" +  aObj.name.replace("&", "&amp;") + "\", \
         \"" + decodeURIComponent(aObj.query) + "\", '" + aObj.service + "'); \n";
    }
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
          " = new coop.Folder(); \
          \ncontentpackfolder" + i + ".name = '" + coopObj.name   + "'; \
          \ncoop.bookmarks_root.children.addOnce(contentpackfolder" + i + "); \n\n";
        }
        // \"" + coopObj.id()   + "\"
        if (coopObj.children) {
          var childEnum = coopObj.children.enumerate();
          while (childEnum.hasMoreElements()) {
            var child = childEnum.getNext();
            if (child.isInstanceOf(faves_coop[type]))
              outputString += this.serialize_single_child[type](child, "contentpackfolder" + i);
          }
        }
        
      } else {
        if (coopObj.isInstanceOf(faves_coop[type]))
         outputString += this.serialize_single_child[type](coopObj, "coop.bookmarks_root");
      }
    }
    return outputString;
  },
  
  serialize_opml: function() {
    var faves_coop = cp_controller.faves_coop;
    var outputString = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<opml version=\"1.0\">\n \
      <head>\n \
        <title>Default Feeds</title>\n \
      </head>\n \
      <body>\n ";
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
        outputString += "</outline>\n";
      } else if (coopObj.isInstanceOf(faves_coop.Feed)) {
          outputString += this.serialize_single_feed(coopObj);
      }
    }
    outputString += "</body>\n</opml>\n";
    return outputString;
  },
  
  //TODO - Loading method
}

function getTopBrowserWindow() {
  var wm = CC["@mozilla.org/appshell/window-mediator;1"]
           .getService(CI.nsIWindowMediator);
  var win = wm.getMostRecentWindow("navigator:browser");
  return win;
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