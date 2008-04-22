var gFilePaths = [
  { path: "/",
    files : ["install.rdf", "chrome.manifest", "build.sh"] },
  { path: "/chrome/content/",
    files : ["contentpack.js", "contentpack-coop.js", "affinityskin.xul", "affinityskin.css"]},
  { path: "/chrome/skin/",
    files : ["myworldOverlay.css"]},
];


var imageRules = {
 "stbar-default.jpg"  : {
   chrome: "",
   apply: function (win, aPath) {
     var statusbars = win.document.getElementsByTagName("statusbar"); 
     for (var i = 0; i < statusbars.length; i++) { 
         statusbars[i].setAttribute("style", "background-image: url(file://" + aPath + "); background-position: top left;");
         statusbars[i].setAttribute("affinityskin", "true");
     }
   }
 },
 "personal-bar-bg.png" : {
   chrome: "chrome://browser/skin/personal-bar-bg.png",
   apply: function (win, aPath) {
   }
 },
 "flockbar-separator.png" : {
   chrome: "chrome://browser/skin/flockbar-separator.png",
   apply: function (win, aPath) {
   }
 },
 "sub-bar-end.png" : {
   chrome: "chrome://browser/skin/sub-bar-end.png",
   apply: function (win, aPath) {
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
    }
  },
  "main-nav-bg.png"  : {
     chrome: "chrome://flock/skin/start/main-nav-bg.png",
     apply: function (win, aPath) {
       var myWin = getMyWorldWin(win);
       if (myWin) {
          var header = myWin.document.getElementById('navbar_controls');
          header.setAttribute("style", "background-image: url(file://" + aPath + ");");
       }
     }
   },
  "myworld-header-color.png" : {
      chrome: "chrome://flock/skin/start/myworld-header-color.png",
      apply: function(win, aPath) { 
        var myWin = getMyWorldWin(win);
        if (myWin) {
          var header = myWin.document.getElementById('headerSection');
          header.setAttribute("style", "background-image: url(file://" + aPath + ");");
        }
      } 
   },
  "Toolbar.png" : {
      chrome: "chrome://browser/skin/Toolbar.png",
      apply: function(win, aPath) { 
      } 
   },
  "Toolbar-small.png" : {
      chrome: "chrome://browser/skin/Toolbar-small.png",
      apply: function(win, aPath) { 
      } 
   },
   "flockBackForward.png" : {
     chrome: "chrome://browser/skin/flockBackForward.png",
     apply: function(win, aPath) {
       
     }
   },
   "flockBackForwardSmall.png" : {
     chrome: "chrome://browser/skin/flockBackForwardSmall.png",
     apply: function(win, aPath) {
       
     }
   },
   "starButton.png" : {
     chrome: "chrome://browser/skin/flock/favorites/starButton.png",
     apply: function(win, aPath) {
       
     }
   },
   "starButton_small.png" : {
     chrome: "chrome://browser/skin/flock/favorites/starButton_small.png",
     apply: function(win, aPath) {
       
     }
   },
   "search-bar-temp.png" : {
      chrome: "chrome://flock/skin/start/search-bar-temp.png",
      apply: function(win, aPath) {
        
      }
   },
   "flockBarIcons.png" : {
      chrome: "chrome://browser/skin/flockBarIcons.png",
      apply: function(win, aPath) {
        
      }
   },
   "bfjoined24.png" : {
     chrome: "chrome://browser/skin/bfjoined24.png",
     apply: function (win, aPath) { }
   },
   
   "bfjoined32.png" : {
     chrome: "chrome://browser/skin/bfjoined32.png",
     apply: function (win, aPath) { }
   },
}

function getMyWorldWin(win) {
  for (var i = 0; i < win.gBrowser.mTabs.length; i++) {
    if (win.gBrowser.mTabs[i].linkedBrowser.currentURI.spec == "about:myworld") {
      return win.gBrowser.mTabs[i].linkedBrowser.docShell;
    }
  } 
}
