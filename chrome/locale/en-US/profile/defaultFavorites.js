// the Flock default favorites - inspired by prefs.js
var GeekBookmarksFolder = new coop.Folder("urn:favorites:contentpack:" + contentpackname + ":screenshots");
GeekBookmarksFolder.name = 'GEEKS - Screenshots';

var bookmarks = {
  "http://www.lifehacker.com" : {
     name: 'How to Stay Productive',
     URL: 'http://www.lifehacker.com'
  },
  "http://www.basecamphq.com" : {
     name: 'Organize your projects',
     URL: 'http://www.basecamphq.com'
  }
};


addStuffTo(bookmarks, GeekBookmarksFolder, coop.Bookmark);
coop.bookmarks_root.children.addOnce(GeekBookmarksFolder);