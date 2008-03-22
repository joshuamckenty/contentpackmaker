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

function copy_file(aFilePath, aTargetPath, aSubst, aFileMode) {
  var contents = getURLContents(aFilePath);
  if (aSubst) {
    for (x in aSubst) {
     contents = contents.replace( aSubst[x].find, aSubst[x].subst); 
    }
  }
  write_file(aTargetPath, contents, aFileMode);
}


function make_dir(aPath) {
  var outfile = getFileFromPath(aPath);
  if (!outfile.exists()) {
    outfile.create(CI.nsIFile.DIRECTORY_TYPE, 0600);
  }
  return outfile;
}

// Write to the file system
function write_file(aFilePath, aContents, aFileMode) {
  var mode = PR_TRUNCATE;
  if (!aFileMode) aFileMode = 0600;
  var outfile = getFileFromPath(aFilePath);
  if (!outfile.exists()) {
    outfile.create(CI.nsIFile.NORMAL_FILE_TYPE, aFileMode);
  }
  var outStream = CC["@mozilla.org/network/file-output-stream;1"]
                  .createInstance(CI.nsIFileOutputStream);
  outStream.init(outfile, PR_WRONLY | PR_CREATE_FILE | mode, aFileMode, 0);
  outStream.write(aContents, aContents.length);
  outStream.close();
}

// JMC TODO - Refactor this into the above
function append_to(aFilePath, aContents) {
  var outfile = getFileFromPath(aFilePath);
  var outStream = CC["@mozilla.org/network/file-output-stream;1"]
                  .createInstance(CI.nsIFileOutputStream);
  outStream.init(outfile, PR_WRONLY | PR_CREATE_FILE | PR_APPEND, 0600, 0);
  outStream.write(aContents, aContents.length);
  outStream.close();
}

function getTopBrowserWindow() {
  var wm = CC["@mozilla.org/appshell/window-mediator;1"]
           .getService(CI.nsIWindowMediator);
  var win = wm.getMostRecentWindow("navigator:browser");
  return win;
}

function getURLContents(aURL){
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

function getFileFromPath(aURL) {
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