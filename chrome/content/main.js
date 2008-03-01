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

function $(x) { return document.getElementById(x); }

var cp_controller = {
  manifest: [],
  init: function() {
    dump("JMC: Init'ing cp_controller\n");
    this.faves_coop = CC["@flock.com/singleton;1"]
                        .getService(CI.flockISingleton)
                        .getSingleton("chrome://flock/content/common/load-faves-coop.js")
                        .wrappedJSObject;
    var dropListener = {
      handleEvent: function(event) {
        nsDragAndDrop.drop(event, cp_dnd);
      }
    }
    document.addEventListener('dragdrop', dropListener, true); 
    
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
  
  set_pack_name: function(aName) {
    this.cp_name = aName.replace(" ", "-");
  },
  
  set_base_dir: function(aPath) {
    this.cp_path = aPath;
    $('cp_base_path').setAttribute("value", aPath);
  },
  
  write_pack: function() {
    this.set_pack_name($('cp_name').value);
    var chromePath = "chrome://contentpackmaker/content/template/";
    var basePath = this.cp_path + "/" + this.cp_name;
    this.make_dir(basePath);
    this.copy_file(chromePath + "install.rdf.template", basePath + "/install.rdf", 
      [{find: /\%EXTENID\%/g, subst: this.cp_name + "@contentpack.flock"}, 
       {find: /\%EXTENNAME\%/g, subst: this.cp_name}]);
    this.copy_file(chromePath + "chrome.manifest.template", basePath + "/chrome.manifest", 
      [{find: /\%EXTENID\%/g, subst: this.cp_name + "@contentpack.flock"}, 
       {find: /\%EXTENNAME\%/g, subst: this.cp_name}]);
    
    
    this.make_dir(basePath + "/locale");
    this.make_dir(basePath + "/locale/en-US");
    this.make_dir(basePath + "/locale/en-US/profile");
    
    var defaultFavesFile = basePath + "/locale/en-US/profile/defaultFavorites.js";
    this.write_file(defaultFavesFile, this.serialize_manifest());
    
    // Create Skin
    
    // Create Defaults
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
    var outfile = flock_getFileFromURL(aFilePath);
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
    var outfile = flock_getFileFromURL(aPath);
    if (!outfile.exists()) {
      outfile.create(CI.nsIFile.DIRECTORY_TYPE, 0600);
    }
  },
  
  add_manifest_url: function (aUrl, aParent) {
    var line = document.createElement("description");
    line.setAttribute("value", aUrl);
    $('cp_manifest').appendChild(line);
  },
  
  add_to_manifest: function(aObj) {
    var faves_coop = CC["@flock.com/singleton;1"]
                        .getService(CI.flockISingleton)
                        .getSingleton("chrome://flock/content/common/load-faves-coop.js")
                        .wrappedJSObject;
    var lines = aObj.split("\n");
    var coopObj = faves_coop.get(lines[0]);
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
  
  serialize_single_child: function(aObj) {
    return "\"" + aObj.URL + "\" : { \n \
       name: '" + aObj.name + "', \n \
       URL: '" + aObj.URL + "' \n \
    },";
  },
  
  serialize_manifest: function() {
    var outputString = "";
    for (var i=0; i < this.manifest.length; i++) {
      var coopObj = this.manifest[i];
      if (coopObj.isInstanceOf(faves_coop.Folder)) {
        outputString += " \
          var contentpackfolder" + i + 
          " = new coop.Folder(\"urn:favorites:contentpack:" 
          + this.cp_name + ":contentpackfolder" + i +"\"); \n \
          contentpackfolder" + i + ".name = '" + coopObj.name   + "'; \n \
          coop.bookmarks_root.children.addOnce(contentpackfolder" + i + "); ";
        
        if (coopObj.children) {
          outputString += "  var bookmarks" + i + " = { ";
          var childEnum = coopObj.children.enumerate();
          while (childEnum.hasMoreElements()) {
            var child = childEnum.getNext();
            outputString += this.serialize_single_child(child);
          }
          outputString += "}; \n addStuffTo(bookmarks" + i + " , contentpackfolder" + i + " , coop.Bookmark); ";
        }
        
      } else {
         
      }
    }
    dump("JMC: \n " + outputString + "\n");
    return outputString;
  },
  
  //TODO - Loading method
}


function flock_getChromeFile(aChromeURL) {
  return getFileInternal(aChromeURL);
}

function getContents(aURL){
  var ioService=Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
  var scriptableStream=Components
    .classes["@mozilla.org/scriptableinputstream;1"]
    .getService(Components.interfaces.nsIScriptableInputStream);

  var channel=ioService.newChannel(aURL,null,null);
  var input=channel.open();
  scriptableStream.init(input);
  var str=scriptableStream.read(input.available());
  scriptableStream.close();
  input.close();
  return str;
}

function flock_getFileFromURL(aURL) {
    aURL = "file://" + aURL;
    return getFileInternal(aURL);
}

function getFileInternal(aURL) {
    var ios = Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService);
    var fileHandler = ios.getProtocolHandler("file")
        .QueryInterface(Components.interfaces.nsIFileProtocolHandler);
    var sourceSpec = fileHandler.getFileFromURLSpec(aURL);
    var sourceFile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsILocalFile);
    sourceFile.initWithFile(sourceSpec);
    return sourceFile;
}

window.addEventListener('load', cp_controller.init, true);