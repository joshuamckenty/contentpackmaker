// Default Media setup

var screenshots = new coop.Folder("urn:media:favorites:contentpack:" + contentpackname + ":screenshots");
screenshots.name = 'Screenshots';

screenshotMQs = {
  "urn:media:favorites:flickr:search:screenshot": {
    serviceId: '@flock.com/photo-api-manager;1?',
    service: 'flickr',
    favicon: "chrome://flock/content/services/flickr/favicon.png",
    query: "search:screenshot",
    name: 'Search for Screenshots',
    isPollable: 'true'
  }
};

addStuffTo(screenshotMQs, screenshots, coop.MediaQuery);

var contentPackFolder = new coop.Folder("urn:media:favorites:contentpack:" + contentpackname);
contentPackFolder.children.addOnce(screenshots);
coop.media_favorites.children.addOnce(contentPackFolder);
